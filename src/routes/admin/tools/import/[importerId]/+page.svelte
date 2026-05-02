<script lang="ts">
  import ConfigureForm from '$lib/components/admin/import/ConfigureForm.svelte';
  import LoadingPhase from '$lib/components/admin/import/LoadingPhase.svelte';
  import StubPanel from '$lib/components/admin/import/StubPanel.svelte';
  import UploadForm from '$lib/components/admin/import/UploadForm.svelte';
  import ReviewForm from '$lib/components/admin/import/ReviewForm.svelte';
  import ResultPanel from '$lib/components/admin/import/ResultPanel.svelte';
  import type { ImportPhase } from '$lib/components/admin/import/phase';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const importer = $derived(data.importer);
  const hasOptions = $derived((importer.options?.length ?? 0) > 0);
  const result = $derived(form && 'result' in form ? (form.result ?? null) : null);
  const failureMessage = $derived(form && 'message' in form ? (form.message ?? null) : null);
  const filename = $derived(form && 'filename' in form ? (form.filename ?? null) : null);
  const strategyUsed = $derived(form && 'strategy' in form ? (form.strategy ?? null) : null);
  const plan = $derived(form && 'plan' in form ? form.plan : null);
  const cancelled = $derived(Boolean(form && 'cancelled' in form && form.cancelled));
  const maxMb = $derived(Math.round(data.maxBytes / (1024 * 1024)));

  let phaseOverride = $state<ImportPhase | null>(null);
  let selectedFile = $state<File | null>(null);

  // The default phase is derived from whatever the most recent form action
  // returned. The override lets us flip into transient phases (planning /
  // committing for the loading spinner; form for "Import again" / cancel).
  const phase = $derived<ImportPhase>(
    phaseOverride ??
      (cancelled || (!plan && !result) ? 'form' : result ? 'result' : plan ? 'review' : 'form'),
  );

  const setPhase = (p: ImportPhase | null) => (phaseOverride = p);
</script>

<svelte:head>
  <title>{importer.label} import — Tools — Admin — tierdom</title>
</svelte:head>

<h1 class="sr-only">{importer.label} import</h1>

<section>
  {#if importer.status === 'stub'}
    <StubPanel
      label={importer.label}
      description={importer.description}
      stubInfo={importer.stubInfo}
    />
  {:else if phase === 'configure' && selectedFile && importer.options}
    <ConfigureForm
      label={importer.label}
      file={selectedFile}
      options={importer.options}
      {setPhase}
    />
  {:else if phase === 'planning'}
    <LoadingPhase title="Reading file…" subtitle="Parsing and validating contents." />
  {:else if phase === 'committing'}
    <LoadingPhase title="Importing…" subtitle="Writing to the database." />
  {:else if phase === 'review' && plan}
    <ReviewForm {plan} {filename} existingCategories={data.existingCategories} {setPhase} />
  {:else if phase === 'result'}
    <ResultPanel
      {result}
      {failureMessage}
      {filename}
      {strategyUsed}
      onImportAgain={() => setPhase('form')}
    />
  {:else}
    <UploadForm
      label={importer.label}
      description={importer.description}
      accept={importer.accept}
      {maxMb}
      {hasOptions}
      {setPhase}
      onFileChosen={(file) => (selectedFile = file)}
    />
  {/if}
</section>
