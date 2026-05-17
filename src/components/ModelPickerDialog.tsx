import { Button } from "@nous-research/ui/ui/components/button";
import { ListItem } from "@nous-research/ui/ui/components/list-item";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import type { GatewayClient } from "@/lib/gatewayClient";
import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const CUSTOM_SLUG = "__custom__";

/**
 * Two-stage model picker modal.
 *
 * Mirrors ui-tui/src/components/modelPicker.tsx:
 *   Stage 1: pick provider (authenticated providers only)
 *   Stage 2: pick model within that provider
 *
 * Two invocation modes:
 *
 * 1. Chat-session mode (ChatSidebar) — pass `gw` + `sessionId`. The picker
 *    loads options via `model.options` JSON-RPC and emits the result as a
 *    slash command string (`/model <model> --provider <slug> [--global]`)
 *    through `onSubmit`, which the ChatPage pipes to `slashExec`.
 *
 * 2. Standalone mode (ModelsPage, Config settings) — pass a `loader` and
 *    `onApply`. The picker fetches options via the REST endpoint and calls
 *    `onApply(provider, model, persistGlobal)` instead of emitting a slash
 *    command.  This lets the Models page reuse the same UI without
 *    requiring an open chat PTY.
 */

interface ModelOptionProvider {
  name: string;
  slug: string;
  models?: string[];
  total_models?: number;
  is_current?: boolean;
}

interface CanonicalEntry {
  slug: string;
  name: string;
  auth_type: string;
  key_env: string;
  default_base_url: string;
  base_url_env_var: string;
  has_key: boolean;
}

interface ModelOptionsResponse {
  model?: string;
  provider?: string;
  providers?: ModelOptionProvider[];
  all_canonical?: CanonicalEntry[];
}

interface Props {
  /** Chat-mode: when present, picker emits a slash command via onSubmit. */
  gw?: GatewayClient;
  sessionId?: string;
  onSubmit?(slashCommand: string): void;

  /** Standalone-mode: when present (and onSubmit absent), picker calls onApply. */
  loader?(): Promise<ModelOptionsResponse>;
  onApply?(args: {
    provider: string;
    model: string;
    persistGlobal: boolean;
  }): Promise<void> | void;

  onClose(): void;
  title?: string;
  /** If true, hides "Persist globally" checkbox — always saves to config.yaml. */
  alwaysGlobal?: boolean;
}

export function ModelPickerDialog(props: Props) {
  const {
    gw,
    sessionId,
    onSubmit,
    loader,
    onApply,
    onClose,
    title = "Switch Model",
    alwaysGlobal = false,
  } = props;
  const standalone = !!loader && !!onApply;

  const [providers, setProviders] = useState<ModelOptionProvider[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [currentProviderSlug, setCurrentProviderSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [query, setQuery] = useState("");
  const [persistGlobal, setPersistGlobal] = useState(alwaysGlobal);
  const [applying, setApplying] = useState(false);
  const closedRef = useRef(false);

  // Add API Key state
  const [allCanonical, setAllCanonical] = useState<CanonicalEntry[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [addKeySlug, setAddKeySlug] = useState("");
  const [addKeyName, setAddKeyName] = useState("");
  const [addKeyBaseUrl, setAddKeyBaseUrl] = useState("");
  const [addKeyValue, setAddKeyValue] = useState("");
  const [addKeyModel, setAddKeyModel] = useState("");
  const [addingKey, setAddingKey] = useState(false);
  const [addKeyError, setAddKeyError] = useState<string | null>(null);

  // Fetch models from base URL
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  const isCustom = addKeySlug === CUSTOM_SLUG;

  const selectedCanonical = useMemo(
    () => (isCustom ? null : allCanonical.find((e) => e.slug === addKeySlug) ?? null),
    [allCanonical, addKeySlug, isCustom],
  );

  // Auto-fill default base URL when provider changes
  useEffect(() => {
    if (selectedCanonical?.default_base_url) {
      setAddKeyBaseUrl(selectedCanonical.default_base_url);
    } else {
      setAddKeyBaseUrl("");
    }
    setFetchedModels([]);
    setFetchModelsError(null);
  }, [selectedCanonical]);

  // Clear fetched models when base URL or API key changes manually
  useEffect(() => {
    setFetchedModels([]);
    setFetchModelsError(null);
  }, [addKeyBaseUrl, addKeyValue]);

  // Load providers + models on open.
  useEffect(() => {
    closedRef.current = false;

    const promise = standalone
      ? (loader as () => Promise<ModelOptionsResponse>)()
      : (gw as GatewayClient).request<ModelOptionsResponse>(
          "model.options",
          sessionId ? { session_id: sessionId } : {},
        );

    promise
      .then((r) => {
        if (closedRef.current) return;
        const next = r?.providers ?? [];
        setProviders(next);
        setAllCanonical(r?.all_canonical ?? []);
        setCurrentModel(String(r?.model ?? ""));
        setCurrentProviderSlug(String(r?.provider ?? ""));
        setSelectedSlug(
          (next.find((p) => p.is_current) ?? next[0])?.slug ?? "",
        );
        setSelectedModel("");
        setLoading(false);
      })
      .catch((e) => {
        if (closedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });

    return () => {
      closedRef.current = true;
    };
    // Deliberately omit props from deps — stable for the dialog's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.slug === selectedSlug) ?? null,
    [providers, selectedSlug],
  );

  const models = useMemo(
    () => [...new Set(selectedProvider?.models ?? [])],
    [selectedProvider],
  );

  const needle = query.trim().toLowerCase();

  const filteredProviders = useMemo(
    () =>
      !needle
        ? providers
        : providers.filter(
            (p) =>
              p.name.toLowerCase().includes(needle) ||
              p.slug.toLowerCase().includes(needle) ||
              (p.models ?? []).some((m) => m.toLowerCase().includes(needle)),
          ),
    [providers, needle],
  );

  const filteredModels = useMemo(
    () =>
      !needle ? models : models.filter((m) => m.toLowerCase().includes(needle)),
    [models, needle],
  );

  // When search filters out the currently selected provider, auto-select the
  // first visible provider so the right column shows matching models.
  useEffect(() => {
    if (!needle || filteredProviders.length === 0) return;
    const stillVisible = filteredProviders.some(
      (p) => p.slug === selectedSlug,
    );
    if (!stillVisible) {
      setSelectedSlug(filteredProviders[0].slug);
      setSelectedModel("");
    }
  }, [filteredProviders, needle, selectedSlug]);

  const canConfirm = !!selectedProvider && !!selectedModel && !applying;

  const confirm = async () => {
    if (!canConfirm || !selectedProvider) return;
    if (standalone && onApply) {
      setApplying(true);
      try {
        await onApply({
          provider: selectedProvider.slug,
          model: selectedModel,
          persistGlobal,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setApplying(false);
      }
    } else if (onSubmit) {
      const global = persistGlobal ? " --global" : "";
      onSubmit(
        `/model ${selectedModel} --provider ${selectedProvider.slug}${global}`,
      );
      onClose();
    }
  };

  const handleAddKey = async () => {
    const slug = isCustom ? addKeyName.trim() : addKeySlug;
    if (!slug || !addKeyValue.trim()) return;
    if (isCustom && !addKeyBaseUrl.trim()) return;
    setAddingKey(true);
    setAddKeyError(null);
    try {
      if (standalone) {
        const res = await fetch("/api/model/provider/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_slug: slug,
            api_key: addKeyValue.trim(),
            base_url: addKeyBaseUrl.trim(),
            default_model: addKeyModel.trim(),
            is_custom: isCustom,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { detail?: string }).detail || `HTTP ${res.status}`,
          );
        }
      } else if (gw) {
        await gw.request("model.save_key", {
          slug,
          api_key: addKeyValue.trim(),
        });
      }
      // Refresh the provider list
      const promise = standalone
        ? (loader as () => Promise<ModelOptionsResponse>)()
        : (gw as GatewayClient).request<ModelOptionsResponse>(
            "model.options",
            sessionId ? { session_id: sessionId } : {},
          );
      const r = await promise;
      if (closedRef.current) return;
      const next = r?.providers ?? [];
      setProviders(next);
      setAllCanonical(r?.all_canonical ?? []);
      setAddKeySlug("");
      setAddKeyName("");
      setAddKeyBaseUrl("");
      setAddKeyValue("");
      setAddKeyModel("");
      setFetchedModels([]);
      setFetchModelsError(null);
      setShowAddKey(false);
    } catch (e) {
      setAddKeyError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddingKey(false);
    }
  };

  const fetchModelsFromApi = async () => {
    if (!addKeyBaseUrl.trim()) return;
    setFetchingModels(true);
    setFetchModelsError(null);
    try {
      const res = await fetch("/api/model/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: addKeyBaseUrl.trim(),
          api_key: addKeyValue.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { detail?: string }).detail ||
            `${res.status} ${res.statusText}`,
        );
      }
      const data = await res.json();
      const models: string[] = data?.models ?? [];
      setFetchedModels(models);
      if (models.length > 0) {
        setAddKeyModel(models[0]);
      }
    } catch (e) {
      setFetchModelsError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-picker-title"
    >
      <div className="relative w-full max-w-3xl max-h-[80vh] border border-border bg-card shadow-2xl flex flex-col">
        <Button
          ghost
          size="icon"
          onClick={onClose}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X />
        </Button>

        <header className="p-5 pb-3 border-b border-border">
          <h2
            id="model-picker-title"
            className="font-display text-base tracking-wider uppercase"
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            current: {currentModel || "(unknown)"}
            {currentProviderSlug && ` · ${currentProviderSlug}`}
          </p>
        </header>

        <div className="px-5 pt-3 pb-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Filter providers and models…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[200px_1fr] overflow-hidden">
          <ProviderColumn
            loading={loading}
            error={error}
            providers={filteredProviders}
            total={providers.length}
            selectedSlug={selectedSlug}
            query={needle}
            onSelect={(slug) => {
              setSelectedSlug(slug);
              setSelectedModel("");
            }}
          />

          <ModelColumn
            key={selectedSlug}
            provider={selectedProvider}
            models={filteredModels}
            allModels={models}
            selectedModel={selectedModel}
            currentModel={currentModel}
            currentProviderSlug={currentProviderSlug}
            onSelect={setSelectedModel}
            onConfirm={(m) => {
              setSelectedModel(m);
              // Confirm on next tick so state settles.
              window.setTimeout(confirm, 0);
            }}
          />
        </div>

        <footer className="border-t border-border p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
          {alwaysGlobal ? (
            <span className="text-xs text-muted-foreground">
              Saves to config.yaml — applies to new sessions.
            </span>
          ) : (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={persistGlobal}
                onChange={(e) => setPersistGlobal(e.target.checked)}
                className="cursor-pointer"
              />
              Persist globally (otherwise this session only)
            </label>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              ghost
              onClick={() => {
                setShowAddKey(!showAddKey);
                if (!showAddKey) {
                  setAddKeyError(null);
                  setAddKeySlug("");
                  setAddKeyName("");
                  setAddKeyBaseUrl("");
                  setAddKeyValue("");
                  setAddKeyModel("");
                  setFetchedModels([]);
                  setFetchModelsError(null);
                }
              }}
            >
              {showAddKey ? "Cancel" : "+ 添加 Provider"}
            </Button>
            <Button outlined onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={!canConfirm}>
              {applying ? <Spinner /> : "Switch"}
            </Button>
          </div>
          </div>

          {showAddKey && (
            <div className="border-t border-border pt-3 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                添加 Provider
              </h3>

              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 items-center text-xs">
                <label className="text-muted-foreground shrink-0">Provider 类型</label>
                <select
                  value={addKeySlug}
                  onChange={(e) => {
                    setAddKeySlug(e.target.value);
                    setAddKeyError(null);
                  }}
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                >
                  <option value="">选择 Provider...</option>
                  {allCanonical
                    .filter((e) => e.auth_type === "api_key" && e.key_env)
                    .map((e) => (
                      <option key={e.slug} value={e.slug}>
                        {e.name}{e.has_key ? " ✓" : ""}
                      </option>
                    ))}
                  <option value={CUSTOM_SLUG}>自定义 (Custom)</option>
                </select>

                {isCustom && (
                  <>
                    <label className="text-muted-foreground shrink-0">Provider 名称</label>
                    <input
                      type="text"
                      placeholder="例如 my-ollama"
                      value={addKeyName}
                      onChange={(e) => setAddKeyName(e.target.value)}
                      className="h-8 rounded border border-border bg-background px-2 text-xs font-mono"
                    />
                  </>
                )}

                <label className="text-muted-foreground shrink-0">Base URL</label>
                <input
                  type="text"
                  placeholder="例如 https://api.example.com/v1"
                  value={addKeyBaseUrl}
                  onChange={(e) => setAddKeyBaseUrl(e.target.value)}
                  className="h-8 rounded border border-border bg-background px-2 text-xs font-mono"
                />

                <label className="text-muted-foreground shrink-0">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={addKeyValue}
                  onChange={(e) => setAddKeyValue(e.target.value)}
                  className="h-8 rounded border border-border bg-background px-2 text-xs font-mono"
                />

                <label className="text-muted-foreground shrink-0">默认模型</label>
                <div className="flex gap-2 items-center">
                  {fetchedModels.length > 0 ? (
                    <select
                      value={addKeyModel}
                      onChange={(e) => setAddKeyModel(e.target.value)}
                      className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs font-mono"
                    >
                      {fetchedModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="例如 claude-sonnet-4"
                      value={addKeyModel}
                      onChange={(e) => setAddKeyModel(e.target.value)}
                      className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs font-mono"
                    />
                  )}
                  <button
                    onClick={fetchModelsFromApi}
                    disabled={fetchingModels || !addKeyBaseUrl.trim()}
                    className="h-8 px-3 rounded border border-border bg-background text-xs font-medium hover:bg-accent disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    {fetchingModels ? (
                      <>
                        <Spinner /> 获取中
                      </>
                    ) : (
                      "获取"
                    )}
                  </button>
                </div>
                {fetchModelsError && (
                  <div className="text-xs text-destructive col-start-2">
                    {fetchModelsError}
                  </div>
                )}
              </div>

              {addKeyError && (
                <div className="text-xs text-destructive">{addKeyError}</div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleAddKey}
                  disabled={
                    !addKeyValue.trim() ||
                    addingKey ||
                    (!isCustom && !addKeySlug) ||
                    (isCustom && (!addKeyName.trim() || !addKeyBaseUrl.trim()))
                  }
                >
                  {addingKey ? <Spinner /> : "添加"}
                </Button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider column                                                    */
/* ------------------------------------------------------------------ */

function ProviderColumn({
  loading,
  error,
  providers,
  total,
  selectedSlug,
  query,
  onSelect,
}: {
  loading: boolean;
  error: string | null;
  providers: ModelOptionProvider[];
  total: number;
  selectedSlug: string;
  query: string;
  onSelect(slug: string): void;
}) {
  return (
    <div className="border-r border-border overflow-y-auto">
      {loading && (
        <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
          <Spinner className="text-xs" /> loading…
        </div>
      )}

      {error && <div className="p-4 text-xs text-destructive">{error}</div>}

      {!loading && !error && providers.length === 0 && (
        <div className="p-4 text-xs text-muted-foreground italic">
          {query
            ? "no matches"
            : total === 0
              ? "no authenticated providers"
              : "no matches"}
        </div>
      )}

      {providers.map((p) => {
        const active = p.slug === selectedSlug;
        return (
          <ListItem
            key={p.slug}
            active={active}
            onClick={() => onSelect(p.slug)}
            className={`items-start text-xs border-l-2 ${
              active ? "border-l-primary" : "border-l-transparent"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate">{p.name}</span>
                {p.is_current && <CurrentTag />}
              </div>
              <div className="text-[0.65rem] text-muted-foreground/80 font-mono truncate">
                {p.slug} · {p.total_models ?? p.models?.length ?? 0} models
              </div>
            </div>
          </ListItem>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Model column                                                       */
/* ------------------------------------------------------------------ */

function ModelColumn({
  provider,
  models,
  allModels,
  selectedModel,
  currentModel,
  currentProviderSlug,
  onSelect,
  onConfirm,
}: {
  provider: ModelOptionProvider | null;
  models: string[];
  allModels: string[];
  selectedModel: string;
  currentModel: string;
  currentProviderSlug: string;
  onSelect(model: string): void;
  onConfirm(model: string): void;
}) {
  if (!provider) {
    return (
      <div className="overflow-y-auto">
        <div className="p-4 text-xs text-muted-foreground italic">
          pick a provider →
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {models.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground italic">
          {allModels.length
            ? "no models match your filter"
            : "no models listed for this provider"}
        </div>
      ) : (
        models.map((m) => {
          const active = m === selectedModel;
          const isCurrent =
            m === currentModel && provider.slug === currentProviderSlug;

          return (
            <ListItem
              key={m}
              active={active}
              onClick={() => onSelect(m)}
              onDoubleClick={() => onConfirm(m)}
              className="px-3 py-1.5 text-xs font-mono"
            >
              <Check
                className={`h-3 w-3 shrink-0 ${active ? "text-primary" : "text-transparent"}`}
              />
              <span className="flex-1 truncate">{m}</span>
              {isCurrent && <CurrentTag />}
            </ListItem>
          );
        })
      )}
    </div>
  );
}

function CurrentTag() {
  return (
    <span className="text-[0.6rem] uppercase tracking-wider text-primary/80 shrink-0">
      current
    </span>
  );
}
