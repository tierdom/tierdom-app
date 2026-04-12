<script lang="ts">
  import { formatRelativeDate } from '$lib/format-date';

  let { createdAt, updatedAt }: { createdAt: string; updatedAt: string } = $props();
</script>

<span class="text-xs text-secondary">
  updated {formatRelativeDate(updatedAt)} &middot; created {formatRelativeDate(createdAt)}
</span>
