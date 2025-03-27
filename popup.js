// 存储所有书签用于搜索
let allBookmarks = [];
let pinnedBookmarks = JSON.parse(localStorage.getItem('pinnedBookmarks')) || [];

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const bookmarksContainer = document.getElementById('bookmarks');
  
  // 添加搜索事件监听
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterBookmarks(searchTerm);
  });

  chrome.bookmarks.getTree((bookmarkTreeNodes) => {
    if (bookmarkTreeNodes[0] && bookmarkTreeNodes[0].children && bookmarkTreeNodes[0].children[0].children) {
      allBookmarks = flattenBookmarks(bookmarkTreeNodes[0].children[0].children);
      processBookmarks(bookmarkTreeNodes[0].children[0].children, bookmarksContainer);
    }
  });
});

// 扁平化书签树结构用于搜索
function flattenBookmarks(nodes) {
  let result = [];
  nodes.forEach(node => {
    if (node.children) {
      result = result.concat(flattenBookmarks(node.children));
    } else if (node.url) {
      result.push(node);
    }
  });
  return result;
}

// 过滤书签
function filterBookmarks(searchTerm) {
  const bookmarksContainer = document.getElementById('bookmarks');
  bookmarksContainer.innerHTML = '';
  
  if (searchTerm === '') {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      if (bookmarkTreeNodes[0] && bookmarkTreeNodes[0].children && bookmarkTreeNodes[0].children[0].children) {
        processBookmarks(bookmarkTreeNodes[0].children[0].children, bookmarksContainer);
      }
    });
    return;
  }

  const filtered = allBookmarks.filter(bookmark => 
    bookmark.title.toLowerCase().includes(searchTerm) || 
    bookmark.url.toLowerCase().includes(searchTerm)
  );
  
  // 显示搜索结果
  filtered.forEach(bookmark => {
    const element = document.createElement('div');
    element.className = 'bookmark';
    element.textContent = `${bookmark.title} (${bookmark.url})`;
    element.addEventListener('click', () => {
      chrome.tabs.create({ url: bookmark.url });
    });
    bookmarksContainer.appendChild(element);
  });
}

/**
 * 递归处理书签节点
 * @param {Array} bookmarkNodes - 书签节点数组
 * @param {HTMLElement} container - 要添加书签的DOM容器
 */
function processBookmarks(bookmarkNodes, container, depth = 0) {
  // 先显示固定书签
  if (depth === 0 && pinnedBookmarks.length > 0) {
    const pinnedContainer = document.createElement('div');
    pinnedContainer.className = 'pinned-container';
    container.appendChild(pinnedContainer);
    
    pinnedBookmarks.forEach(bookmark => {
      const pinnedElement = document.createElement('div');
      pinnedElement.className = 'bookmark pinned';
      pinnedElement.style.marginLeft = `${depth * 15}px`;
      pinnedElement.style.display = 'flex';
      pinnedElement.style.justifyContent = 'space-between';
      pinnedElement.style.alignItems = 'center';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${bookmark.title} ★`;
      pinnedElement.appendChild(titleSpan);
      
      const unpinIcon = document.createElement('span');
      unpinIcon.className = 'unpin-icon';
      unpinIcon.title = '取消固定';
      unpinIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedBookmarks = pinnedBookmarks.filter(b => b.id !== bookmark.id);
        localStorage.setItem('pinnedBookmarks', JSON.stringify(pinnedBookmarks));
        filterBookmarks(document.getElementById('search').value);
      });
      pinnedElement.appendChild(unpinIcon);
      
      pinnedElement.addEventListener('click', (e) => {
        if (e.target === pinnedElement || e.target === titleSpan) {
          chrome.tabs.create({ url: bookmark.url });
        }
      });
      
      pinnedContainer.appendChild(pinnedElement);
    });
  }
  bookmarkNodes.forEach((node) => {
    if (node.children) {
      // 创建文件夹元素
      const folderElement = document.createElement('div');
      folderElement.className = 'folder';
      folderElement.textContent = node.title;
      folderElement.style.marginLeft = `${depth * 15}px`;
      
      // 创建子容器
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'children';
      
      // 添加点击事件切换展开状态
      folderElement.addEventListener('click', (e) => {
        e.stopPropagation();
        folderElement.classList.toggle('expanded');
      });
      
      container.appendChild(folderElement);
      container.appendChild(childrenContainer);
      processBookmarks(node.children, childrenContainer, depth + 1);
      
    } else if (node.url) {
      const bookmarkElement = document.createElement('div');
      bookmarkElement.className = 'bookmark';
      bookmarkElement.style.marginLeft = `${depth * 15}px`;
      bookmarkElement.style.display = 'flex';
      bookmarkElement.style.justifyContent = 'space-between';
      bookmarkElement.style.alignItems = 'center';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = node.title;
      bookmarkElement.appendChild(titleSpan);
      
      const pinIcon = document.createElement('span');
      pinIcon.className = 'pin-icon';
      pinIcon.title = '固定此书签';
      pinIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!pinnedBookmarks.some(b => b.id === node.id)) {
          pinnedBookmarks.push(node);
          localStorage.setItem('pinnedBookmarks', JSON.stringify(pinnedBookmarks));
          filterBookmarks(document.getElementById('search').value);
        }
      });
      bookmarkElement.appendChild(pinIcon);
      
      bookmarkElement.addEventListener('click', (e) => {
        if (e.target === bookmarkElement || e.target === titleSpan) {
          chrome.tabs.create({ url: node.url });
        }
      });
      
      container.appendChild(bookmarkElement);
    }
  });
}