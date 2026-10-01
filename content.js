
// 确保监听器只设置一次
if (!window.base64ConverterListenerSet) {
  window.base64ConverterListenerSet = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "encode" || request.action === "decode") {
      // 处理编码/解码逻辑
      let result;
      try {
        if (request.action === "encode") {
          result = btoa(unescape(encodeURIComponent(request.text)));
        } else {
          result = decodeURIComponent(escape(atob(request.text)));
        }
      } catch (e) {
        result = `Error: ${e.message}`;
      }

      // 显示弹出窗口
      showPopup(result);

      // 发送响应
      sendResponse({ success: true });
    }
    return true; // 保持消息通道开放以支持异步响应
  });
}
// 在全局作用域中添加样式加载标记
window.base64ConverterStylesLoaded = false;

function applyPopupStyles() {
  if (window.base64ConverterStylesLoaded) return;

  const style = document.createElement('style');
  style.textContent = `
    .base64-popup {
      position: fixed;
      z-index: 999999;
      width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      font-family: Arial, sans-serif;
      overflow: hidden;
      max-width: 80%;;
      max-height: 90vh;
    }

    .base64-popup-header {
      padding: 10px 15px;
      background: #4285f4;
      color: white;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .base64-popup-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .base64-popup-content {
      padding: 5px;
    }

    .base64-content-display {
      width: 94%;
      min-height: 60px;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: monospace;
      background: #f8f8f8;
      overflow: auto;
    }

    .base64-popup-copy {
      background: #4285f4;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      float: right;
    }

    .base64-popup-copy:hover {
      background: #3367d6;
    }
  `;
  document.head.appendChild(style);
  window.base64ConverterStylesLoaded = true;
}

function showPopup(content) {
  applyPopupStyles();

  // 移除现有的弹出窗口（如果有）
  const existingPopup = document.getElementById('base64-converter-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // 创建弹出窗口容器
  const popup = document.createElement('div');
  popup.id = 'base64-converter-popup';
  popup.className = 'base64-popup';

  // 设置内容 - 使用 div 代替 textarea 以获得更好的自动调整
  popup.innerHTML = `
    <div class="base64-popup-header">
      <span>Base64 Converter - 1.0.1</span>
      <button class="base64-popup-close">&times;</button>
    </div>
    <div class="base64-popup-content">
      <div class="base64-content-display" contenteditable="false">${content}</div>
      <button class="base64-popup-copy">Copy</button>
    </div>
  `;

  // 添加到文档
  document.body.appendChild(popup);

  // 定位弹出窗口
  positionPopupNearSelection(popup);

  // 获取内容显示元素
  const contentDisplay = popup.querySelector('.base64-content-display');

  // 自动调整大小
  //autoResizeContentDisplay(contentDisplay);

  // 添加关闭按钮事件
  const closeButton = popup.querySelector('.base64-popup-close');
  closeButton.addEventListener('click', () => {
    popup.remove();
  });

  // 添加复制按钮事件
  const copyButton = popup.querySelector('.base64-popup-copy');
  copyButton.addEventListener('click', () => {
    const range = document.createRange();
    range.selectNode(contentDisplay);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy';
    }, 2000);
  });

  // 点击外部关闭弹出窗口
  document.addEventListener('click', function outsideClickListener(e) {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', outsideClickListener);
    }
  });
}

// 自动调整内容显示区域大小
function autoResizeContentDisplay(element) {
  // 计算内容所需宽度（基于最长行）
  const lines = element.textContent.split('\n');
  const longestLine = lines.reduce((longest, line) =>
    line.length > longest.length ? line : longest, '');

  // 计算大致宽度（每个字符约8px，最小200px，最大80%窗口宽度）
  const charWidth = 8;
  const minWidth = 200;
  const maxWidth = window.innerWidth * 0.8;
  let calculatedWidth = longestLine.length * charWidth;

  // 限制宽度范围
  calculatedWidth = Math.max(minWidth, Math.min(calculatedWidth, maxWidth));

  // 计算高度（每行约20px，最小60px，最大60%窗口高度）
  const lineHeight = 20;
  const minHeight = 60;
  const maxHeight = window.innerHeight * 0.6;
  let calculatedHeight = lines.length * lineHeight;

  // 限制高度范围
  calculatedHeight = Math.max(minHeight, Math.min(calculatedHeight, maxHeight));

  // 应用计算尺寸
  element.style.width = `${calculatedWidth}px`;
  element.style.height = `${calculatedHeight}px`;

  // 添加滚动条如果需要
  element.style.overflow = 'auto';
}

function positionPopupNearSelection(popup) {
  // 弹出窗口使用 position: fixed，因此鼠标位置与选择区域都统一使用视口坐标，
  // 不再叠加滚动偏移，避免页面滚动后定位偏移。
  const hasMousePosition =
    typeof window.base64MouseX === 'number' &&
    typeof window.base64MouseY === 'number';

  // 优先使用鼠标位置
  if (hasMousePosition) {
    positionPopupAtCoordinates(popup, window.base64MouseX, window.base64MouseY);
    return;
  }

  // 没有鼠标位置时，基于文本选择定位
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    // 在选中文本下方显示；选区不可见（宽高均为 0）时退化到居中
    if (rect.width || rect.height) {
      positionPopupWithViewportCheck(popup, rect.left, rect.bottom + 5);
      return;
    }
  }

  // 兜底：视口中央偏上位置
  positionPopupAtCenter(popup);
}

// 辅助函数：基于坐标定位（x、y 均为视口坐标）
function positionPopupAtCoordinates(popup, x, y) {
  // 添加偏移量，避免被鼠标遮挡
  const offsetX = 10;
  const offsetY = 20;

  positionPopupWithViewportCheck(popup, x + offsetX, y + offsetY);
}

// 辅助函数：居中定位（视口坐标）
function positionPopupAtCenter(popup) {
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  const left = (viewportWidth - popup.offsetWidth) / 2;
  const top = (viewportHeight - popup.offsetHeight) / 3; // 不是完全居中，偏上一点

  positionPopupWithViewportCheck(popup, left, top);
}

// 辅助函数：检查视口边界（left、top 为视口坐标）
function positionPopupWithViewportCheck(popup, left, top) {
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  const margin = 10;

  // 限制在视口范围内，保证弹出窗口始终可见
  const maxLeft = Math.max(margin, viewportWidth - width - margin);
  const maxTop = Math.max(margin, viewportHeight - height - margin);

  left = Math.min(Math.max(margin, left), maxLeft);
  top = Math.min(Math.max(margin, top), maxTop);

  popup.style.position = 'fixed';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// 捕获鼠标位置（视口坐标）：右键菜单与普通点击都会记录
function recordMousePosition(e) {
  window.base64MouseX = e.clientX;
  window.base64MouseY = e.clientY;
}

if (!window.base64MouseListenerSet) {
  window.base64MouseListenerSet = true;
  document.addEventListener('mousedown', recordMousePosition, true);
  document.addEventListener('contextmenu', recordMousePosition, true);
}
