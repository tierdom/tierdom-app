<!--
  A textarea pre-configured for editing Markdown content.
  Wraps FormField with multiline enabled and taller rows.
-->

<script lang="ts">
  import FormField from './FormField.svelte';

  type Props = {
    label?: string;
    name?: string;
    value?: string | null;
    required?: boolean;
  };

  let { label = 'Content', name = 'content', value = '', required = false }: Props = $props();
</script>

<FormField {label} {name} {value} {required} multiline rows={9} help="Supports Markdown" />
