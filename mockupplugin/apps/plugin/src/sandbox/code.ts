import { onMessage, send, sendError } from './bus.js';
import { readConfig, writeConfig } from './storage.js';
import { resolveSelection } from './selection.js';
import { importItem } from './import.js';
import { applyRender, exportDesigns } from './render.js';

const UI_WIDTH = 420;
const UI_HEIGHT = 640;

figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT, themeColors: true });

async function publishSelection(): Promise<void> {
  const resolved = await resolveSelection();
  send({
    type: 'selection-changed',
    targets: resolved.targets,
    foreignCount: resolved.foreignCount,
  });
}

onMessage(async (message) => {
  switch (message.type) {
    case 'ui-ready': {
      send({ type: 'sandbox-ready', config: await readConfig() });
      await publishSelection();
      return;
    }
    case 'get-config': {
      send({ type: 'config', config: await readConfig() });
      return;
    }
    case 'set-config': {
      send({ type: 'config', config: await writeConfig(message.config) });
      return;
    }
    case 'resize-ui': {
      figma.ui.resize(
        Math.max(320, Math.round(message.width)),
        Math.max(320, Math.round(message.height)),
      );
      return;
    }
    case 'refresh-selection': {
      await publishSelection();
      return;
    }
    case 'notify': {
      figma.notify(message.message, { error: message.error });
      return;
    }
    case 'focus-node': {
      const node = await figma.getNodeByIdAsync(message.nodeId);
      if (node && 'x' in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      return;
    }
    case 'import-item': {
      const { instanceGuid, itemNodeId } = await importItem(message.detail, message.preview);
      send({ type: 'import-done', instanceGuid, itemId: message.detail.id, itemNodeId });
      figma.notify(`Added ${message.detail.name}. Drop your design in the frame beside it.`);
      await publishSelection();
      return;
    }
    case 'export-designs': {
      try {
        const targets = await exportDesigns(message.instanceGuids);
        if (targets.length === 0) {
          sendError(
            'no_targets',
            'Could not find those mockups on this page. They may have been deleted.',
            message.jobId,
          );
          return;
        }
        send({ type: 'designs-exported', jobId: message.jobId, targets });
      } catch (err) {
        sendError('export_failed', (err as Error).message, message.jobId);
      }
      return;
    }
    case 'apply-render': {
      await applyRender(
        message.instanceGuid,
        message.png,
        { width: message.width, height: message.height },
        message.renderId,
      );
      send({ type: 'render-applied', instanceGuid: message.instanceGuid, renderId: message.renderId });
      return;
    }
  }
});

figma.on('selectionchange', () => {
  void publishSelection();
});
