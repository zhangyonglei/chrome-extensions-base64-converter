// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 创建父菜单
  chrome.contextMenus.create({
    id: "base64Menu",
    title: "Base64",
    contexts: ["selection"]
  });

  // 创建子菜单 - 编码
  chrome.contextMenus.create({
    id: "encode",
    parentId: "base64Menu",
    title: "Encode",
    contexts: ["selection"]
  });

  // 创建子菜单 - 解码
  chrome.contextMenus.create({
    id: "decode",
    parentId: "base64Menu",
    title: "Decode",
    contexts: ["selection"]
  });
});

// 监听菜单点击事件
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "encode" || info.menuItemId === "decode") {
    try {
      // 检查标签是否仍然有效
      if (!tab || !tab.id) {
        throw new Error('Invalid tab');
      }

      // 注入内容脚本
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 发送消息并等待响应
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId,
        text: info.selectionText
      });

      if (!response || !response.success) {
        throw new Error('No response from content script');
      }
    } catch (error) {
      console.error('Error in context menu handler:', error);
      // 可以在这里添加用户可见的错误提示
    }
  }
});
