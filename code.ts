figma.showUI(__html__, {
  width: 360,
  height: 260,
  themeColors: true,
});

type StoredHoverData = {
  strokeWeight: number;
  strokes: Paint[];
};

const PLUGIN_DATA_KEY = 'hoverEffectOriginalStroke';

function isStrokeCapable(node: SceneNode): node is SceneNode & GeometryMixin {
  return 'strokes' in node && 'strokeWeight' in node;
}

function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '').trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error('Please enter a valid 6-digit hex color.');
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  return { r, g, b };
}

function getSingleSelectedNode(): SceneNode {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    throw new Error('Please select exactly one element.');
  }

  return selection[0];
}

function applyHoverEffect(colorHex: string, weight: number): void {
  const node = getSingleSelectedNode();

  if (!isStrokeCapable(node)) {
    throw new Error('Selected element does not support stroke editing.');
  }

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('Weight must be a number greater than 0.');
  }

  const existingData = node.getPluginData(PLUGIN_DATA_KEY);

  if (!existingData) {
    const originalData: StoredHoverData = {
      strokeWeight:
        typeof node.strokeWeight === 'number' ? node.strokeWeight : 1,
      strokes: [...node.strokes],
    };

    node.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(originalData));
  }

  const rgb = hexToRgb(colorHex);

  node.strokes = [
    {
      type: 'SOLID',
      color: rgb,
    },
  ];
  node.strokeWeight = weight;

  figma.notify('Hover effect applied.');
}

function undoHoverEffect(): void {
  const node = getSingleSelectedNode();

  if (!isStrokeCapable(node)) {
    throw new Error('Selected element does not support stroke editing.');
  }

  const storedData = node.getPluginData(PLUGIN_DATA_KEY);

  if (!storedData) {
    throw new Error('No hover effect data found to undo.');
  }

  const originalData = JSON.parse(storedData) as StoredHoverData;

  node.strokes = originalData.strokes;
  node.strokeWeight = originalData.strokeWeight;
  node.setPluginData(PLUGIN_DATA_KEY, '');

  figma.notify('Hover effect removed.');
}

type UIMessage =
  | {
      type: 'apply-hover';
      color?: string;
      weight?: string | number;
    }
  | {
      type: 'undo-hover';
    }
  | {
      type: 'close-plugin';
    };

figma.ui.onmessage = (msg: UIMessage) => {
  try {
    if (msg.type === 'apply-hover') {
      const color = msg.color !== undefined ? msg.color : '#0D99FF';
      const weight = msg.weight !== undefined ? Number(msg.weight) : 2;

      applyHoverEffect(color, weight);

      figma.ui.postMessage({
        type: 'success',
        message: 'Hover effect applied successfully.',
      });
      return;
    }

    if (msg.type === 'undo-hover') {
      undoHoverEffect();

      figma.ui.postMessage({
        type: 'success',
        message: 'Hover effect undone successfully.',
      });
      return;
    }

    if (msg.type === 'close-plugin') {
      figma.closePlugin();
      return;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong.';

    figma.ui.postMessage({
      type: 'error',
      message: message,
    });
  }
};