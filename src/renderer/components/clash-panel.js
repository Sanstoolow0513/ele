const { ipcRenderer } = require('electron');

/**
 * Clash代理面板组件类
 */
class ClashPanel {
  /**
   * 创建Clash面板组件
   * @param {Object} options - 组件选项
   * @param {string} options.statusTextId - 状态文本元素ID
   * @param {string} options.statusSpinnerId - 状态加载指示器元素ID
   * @param {string} options.startBtnId - 启动按钮元素ID
   * @param {string} options.stopBtnId - 停止按钮元素ID
   * @param {string} options.refreshNodesBtnId - 刷新节点按钮元素ID
   * @param {string} options.nodeListId - 节点列表元素ID
   */
  constructor(options) {
    this.statusText = document.getElementById(options.statusTextId);
    this.statusSpinner = document.getElementById(options.statusSpinnerId);
    this.startBtn = document.getElementById(options.startBtnId);
    this.stopBtn = document.getElementById(options.stopBtnId);
    this.refreshNodesBtn = document.getElementById(options.refreshNodesBtnId);
    this.nodeList = document.getElementById(options.nodeListId);

    // 验证元素是否存在
    if (!this.statusText) console.error('[ClashPanel] 找不到状态文本元素');
    if (!this.statusSpinner) console.error('[ClashPanel] 找不到状态加载指示器元素');
    if (!this.startBtn) console.error('[ClashPanel] 找不到启动按钮元素');
    if (!this.stopBtn) console.error('[ClashPanel] 找不到停止按钮元素');
    if (!this.refreshNodesBtn) console.error('[ClashPanel] 找不到刷新节点按钮元素');
    if (!this.nodeList) console.error('[ClashPanel] 找不到节点列表元素');
  }

  /**
   * 初始化组件
   */
  initialize() {
    console.log('[ClashPanel] 初始化Clash面板组件');
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   * @private
   */
  setupEventListeners() {
    // 启动按钮
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        console.log('[ClashPanel] 点击启动按钮');
        ipcRenderer.send('start-clash');
      });
    }

    // 停止按钮
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => {
        console.log('[ClashPanel] 点击停止按钮');
        ipcRenderer.send('stop-clash');
      });
    }

    // 刷新节点按钮
    if (this.refreshNodesBtn) {
      this.refreshNodesBtn.addEventListener('click', () => {
        console.log('[ClashPanel] 点击刷新节点按钮');
        this.fetchProxyList();
      });
    }

    // 监听Clash状态更新
    ipcRenderer.on('clash-status-update', (event, { status, message }) => {
      console.log(`[ClashPanel] Clash状态更新: ${status}`, message || '');
      this.updateClashStatus(status, message);
    });

    // 监听Clash服务启动错误
    ipcRenderer.on('clash-service-error', (event, message) => {
      console.error(`[ClashPanel] Clash服务错误: ${message}`);
      // 直接用错误消息更新状态
      this.updateClashStatus('error', message);
    });

    // 监听代理列表更新
    ipcRenderer.on('proxy-list-update', (event, proxyList) => {
      console.log('[ClashPanel] 代理列表更新:', proxyList);
      this.renderProxyList(proxyList);
    });
  }

  /**
   * 更新Clash状态UI
   * @param {string} status - 状态标识 ('starting', 'running', 'stopping', 'stopped', 'error')
   * @param {string} message - 可选的状态消息
   * @private
   */
  updateClashStatus(status, message) {
    if (!this.statusText || !this.statusSpinner || !this.startBtn || !this.stopBtn) return;

    // 重置样式
    this.statusText.style.color = '';

    switch (status) {
      case 'starting':
        this.statusText.textContent = 'Clash: 启动中...';
        this.statusSpinner.style.display = 'block';
        this.startBtn.disabled = true;
        this.stopBtn.disabled = true;
        break;
      case 'running':
        this.statusText.textContent = 'Clash: 运行中';
        this.statusSpinner.style.display = 'none';
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        
        // 如果Clash正在运行，尝试获取代理列表
        this.fetchProxyList();
        break;
      case 'stopping':
        this.statusText.textContent = 'Clash: 停止中...';
        this.statusSpinner.style.display = 'block';
        this.startBtn.disabled = true;
        this.stopBtn.disabled = true;
        break;
      case 'stopped':
        this.statusText.textContent = 'Clash: 已停止';
        this.statusSpinner.style.display = 'none';
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // 清空节点列表
        if (this.nodeList) {
          this.nodeList.innerHTML = '<li class="node-item">Clash 未运行，无法获取节点</li>';
        }
        break;
      case 'error':
        this.statusText.textContent = `Clash 错误: ${message || '未知错误'}`;
        this.statusText.style.color = 'var(--error-color)';
        this.statusSpinner.style.display = 'none';
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        // 不再使用alert，直接在状态栏显示信息
        break;
    }
  }

  /**
   * 获取代理列表
   * @private
   */
  fetchProxyList() {
    console.log('[ClashPanel] 请求代理列表');
    ipcRenderer.send('get-proxy-list');
    
    if (this.nodeList) {
      this.nodeList.innerHTML = '<li class="node-item loading">正在加载节点列表...</li>';
    }
  }

  /**
   * 渲染代理列表
   * @param {Array} proxyList - 代理列表数据
   * @private
   */
  renderProxyList(proxyList) {
    if (!this.nodeList) return;
    
    // 清空列表
    this.nodeList.innerHTML = '';
    
    if (proxyList.length === 0) {
      this.nodeList.innerHTML = '<li class="node-item">未找到可用节点</li>';
      return;
    }
    
    // 添加代理组
    proxyList.forEach(proxy => {
      const groupItem = document.createElement('li');
      groupItem.className = 'node-group';
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'node-group-header';
      groupHeader.innerHTML = `
        <span class="node-group-name">${proxy.name}</span>
        <span class="node-group-current">当前: ${proxy.current}</span>
      `;
      
      groupItem.appendChild(groupHeader);
      
      // 添加节点选项
      if (proxy.options && proxy.options.length > 0) {
        const optionsList = document.createElement('ul');
        optionsList.className = 'node-options';
        
        proxy.options.forEach(option => {
          const optionItem = document.createElement('li');
          optionItem.className = 'node-option';
          if (option === proxy.current) {
            optionItem.classList.add('active');
          }
          
          optionItem.textContent = option;
          optionItem.addEventListener('click', () => {
            this.switchProxy(proxy.name, option);
          });
          
          optionsList.appendChild(optionItem);
        });
        
        groupItem.appendChild(optionsList);
      }
      
      this.nodeList.appendChild(groupItem);
    });
  }

  /**
   * 切换代理
   * @param {string} groupName - 代理组名称
   * @param {string} proxyName - 代理名称
   * @private
   */
  switchProxy(groupName, proxyName) {
    console.log(`[ClashPanel] 切换代理: ${groupName} => ${proxyName}`);
    ipcRenderer.send('switch-proxy', { groupName, proxyName });
  }
}

module.exports = { ClashPanel }; 