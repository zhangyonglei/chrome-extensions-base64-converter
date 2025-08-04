
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
      position: absolute;
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
      <span>Base64 Converter - By Yonglei</span>
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
  // 首先尝试基于鼠标位置定位
  const mouseX = window.mouseX || 0;
  const mouseY = window.mouseY || 0;

  // 如果有有效的鼠标位置，优先使用
  if (mouseX > 0 && mouseY > 0) {
    positionPopupAtCoordinates(popup, mouseX, mouseY);
    return;
  }

  // 如果没有鼠标位置，则尝试基于文本选择定位
  const selection = window.getSelection();
  if (!selection.rangeCount) {
    // 如果没有选中文本，使用默认位置（视口中央）
    positionPopupAtCenter(popup);
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 计算位置（在选中文本下方）
  const top = rect.bottom + window.scrollY + 5;
  const left = rect.left + window.scrollX;

  // 确保弹出窗口不会超出视口
  positionPopupWithViewportCheck(popup, left, top);
}

// 辅助函数：基于坐标定位
function positionPopupAtCoordinates(popup, x, y) {
  // 添加偏移量，避免被鼠标遮挡
  const offsetX = 10;
  const offsetY = 20;

  positionPopupWithViewportCheck(popup, x + offsetX, y + offsetY);
}

// 辅助函数：居中定位
function positionPopupAtCenter(popup) {
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  const left = (viewportWidth - popup.offsetWidth) / 2;
  const top = (viewportHeight - popup.offsetHeight) / 3; // 不是完全居中，偏上一点

  positionPopupWithViewportCheck(popup, left, top);
}

// 辅助函数：检查视口边界
function positionPopupWithViewportCheck(popup, left, top) {
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  // 确保不会超出视口右侧
  if (left + popup.offsetWidth > viewportWidth) {
    left = viewportWidth - popup.offsetWidth - 10;
  }

  // 确保不会超出视口底部
  if (top + popup.offsetHeight > viewportHeight) {
    top = viewportHeight - popup.offsetHeight - 10;
  }

  // 确保不会超出视口左侧和顶部
  left = Math.max(10, left);
  top = Math.max(10, top);

  popup.style.position = 'absolute';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// 捕获鼠标位置
document.addEventListener('mousedown', (e) => {
  window.mouseX = e.clientX;
  window.mouseY = e.clientY;
});
