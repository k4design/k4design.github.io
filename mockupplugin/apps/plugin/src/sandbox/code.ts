import { onMessage, send } from './bus.js';
import { readConfig, writeConfig } from './storage.js';
import { resolveSelection } from './selection.js';

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
    // Import, export and render land in later milestones.
    case 'import-item':
    case 'export-designs':
    case 'apply-render': {
      figma.notify('That action is not available in this build yet.', { error: true });
      return;
    }
  }
});

figma.on('selectionchange', () => {
  void publishSelection();
});
