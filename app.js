// --- STATE ---
let elements = [];
let selectedId = null;
let config = { backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif' };
let previewMode = 'desktop';
let dragSourceType = null;
let dragSourceId = null;

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 11);

const getDefaultElement = (type) => {
  const base = { id: generateId(), type, content: '', styles: { padding: '16px' } };
  switch (type) {
    case 'heading': return { ...base, content: 'Heading Text', styles: { ...base.styles, fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: '#111827' } };
    case 'text': return { ...base, content: 'Add your text here.', styles: { ...base.styles, fontSize: '16px', lineHeight: '1.5', textAlign: 'center', color: '#4b5563' } };
    case 'image': return { ...base, content: 'https://placehold.co/600x200', styles: { ...base.styles, width: '100%', borderRadius: '0px', textAlign: 'center' } };
    case 'button': return { ...base, content: 'Click Here', styles: { ...base.styles, backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '16px', padding: '12px 24px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', display: 'inline-block', width: 'auto' } };
    case 'divider': return { ...base, content: '', styles: { ...base.styles, padding: '24px 0', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e5e7eb', width: '100%' } };
    case 'columns': return { ...base, content: '', styles: { ...base.styles, padding: '0px' }, columns: [[], []] };
    default: return base;
  }
};

const getElementHtml = (el) => {
  let styleStr = Object.entries(el.styles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
  
  if (el.type === 'heading' || el.type === 'text') {
    return `<div style="${styleStr}">${el.content}</div>`;
  } else if (el.type === 'image') {
    return `<div style="text-align: ${el.styles.textAlign || 'center'}; padding: ${el.styles.padding || '0'}; width: 100%;"><img src="${el.content}" style="max-width: 100%; width: ${el.styles.width || 'auto'}; border-radius: ${el.styles.borderRadius || '0'}; display: inline-block;" /></div>`;
  } else if (el.type === 'button') {
    const btnStyle = { ...el.styles };
    const align = btnStyle.textAlign || 'center';
    delete btnStyle.textAlign;
    let btnStyleStr = Object.entries(btnStyle).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
    return `<div style="text-align: ${align}; padding: ${el.styles.padding || '0'}; width: 100%;"><span style="${btnStyleStr}">${el.content}</span></div>`;
  } else if (el.type === 'divider') {
    return `<div style="padding: ${el.styles.padding || '0'}; width: 100%;"><div style="border-top-width: ${el.styles.borderTopWidth}; border-top-style: ${el.styles.borderTopStyle}; border-top-color: ${el.styles.borderTopColor}; width: 100%;"></div></div>`;
  }
  return '';
};

// --- DOM ELEMENTS ---
const canvasEl = document.getElementById('email-canvas');
const canvasWrapper = document.getElementById('canvas-wrapper');
const propertiesContent = document.getElementById('properties-content');
const btnDesktop = document.getElementById('btn-desktop');
const btnMobile = document.getElementById('btn-mobile');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportHtml = document.getElementById('btn-export-html');
const btnImportJson = document.getElementById('btn-import-json');
const inputImportJson = document.getElementById('input-import-json');
const sidebarBlocks = document.querySelectorAll('.drag-item');

function findElementPath(id, currentList) {
  for (let i = 0; i < currentList.length; i++) {
    if (currentList[i].id === id) {
      return { list: currentList, index: i };
    }
    if (currentList[i].type === 'columns' && currentList[i].columns) {
      for (let c = 0; c < currentList[i].columns.length; c++) {
        const found = findElementPath(id, currentList[i].columns[c]);
        if (found) return found;
      }
    }
  }
  return null;
}

function findElementById(id) {
    const path = findElementPath(id, elements);
    return path ? path.list[path.index] : null;
}

function isChild(parentId, childId) {
    const parent = findElementById(parentId);
    if(!parent || !parent.columns) return false;
    for(let c of parent.columns) {
        if(c.find(x => x.id === childId)) return true;
        for(let childEl of c) {
            if(isChild(childEl.id, childId)) return true;
        }
    }
    return false;
}

function deleteElementById(id, currentList = elements) {
  for (let i = 0; i < currentList.length; i++) {
    if (currentList[i].id === id) {
      currentList.splice(i, 1);
      return true;
    }
    if (currentList[i].type === 'columns' && currentList[i].columns) {
      for (let c = 0; c < currentList[i].columns.length; c++) {
        if (deleteElementById(id, currentList[i].columns[c])) return true;
      }
    }
  }
  return false;
}

// --- RENDER FUNCTIONS ---
function renderCanvas() {
  canvasEl.innerHTML = '';
  canvasWrapper.style.backgroundColor = config.backgroundColor;
  canvasEl.style.backgroundColor = '#ffffff';

  if (elements.length === 0) {
    canvasEl.innerHTML = `
      <div class="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 m-4 rounded-xl text-center p-8 pointer-events-none" style="min-height: 400px;">
        <div>
          <div class="text-gray-400 mb-2"><svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div>
          <h3 class="text-sm font-medium text-gray-900">No content yet</h3>
          <p class="mt-1 text-sm text-gray-500">Drag and drop blocks from the sidebar.</p>
        </div>
      </div>
    `;
    return;
  }

  elements.forEach(el => renderElement(el, canvasEl));
  
  // Attach delete handlers
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      deleteElementById(id);
      if (selectedId === id) selectedId = null;
      renderCanvas();
      renderProperties();
    });
  });
}

function renderElement(el, container) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = `canvas-item ${selectedId === el.id ? 'selected' : ''}`;
    itemWrapper.draggable = true;
    itemWrapper.dataset.id = el.id;
    
    if (el.type === 'columns') {
        let colHtml = `<div style="display: flex; gap: 16px; width: 100%; padding: ${el.styles.padding || '0'};">`;
        const numCols = el.columns ? el.columns.length : 2;
        for(let i=0; i<numCols; i++) {
           colHtml += `<div class="column-zone" data-parent-id="${el.id}" data-col-index="${i}" style="flex: 1; min-height: 50px; border: 1px dashed #ccc; padding: 4px; display: flex; flex-direction: column;"></div>`;
        }
        colHtml += `</div>`;
        itemWrapper.innerHTML = `
          ${colHtml}
          <button class="delete-btn" data-id="${el.id}">×</button>
        `;
    } else {
        itemWrapper.innerHTML = `
          ${getElementHtml(el)}
          <button class="delete-btn" data-id="${el.id}">×</button>
        `;
    }

    itemWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedId = el.id;
      renderCanvas();
      renderProperties();
    });
    
    itemWrapper.addEventListener('dragstart', (e) => {
      dragSourceId = el.id;
      itemWrapper.style.opacity = '0.5';
      e.dataTransfer.setData('text/plain', 'canvas-item');
      e.stopPropagation();
    });

    itemWrapper.addEventListener('dragend', (e) => {
      itemWrapper.style.opacity = '1';
      dragSourceId = null;
      e.stopPropagation();
    });
    
    itemWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = itemWrapper.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        itemWrapper.style.borderTop = '2px solid #4f46e5';
        itemWrapper.style.borderBottom = 'none';
      } else {
        itemWrapper.style.borderBottom = '2px solid #4f46e5';
        itemWrapper.style.borderTop = 'none';
      }
    });

    itemWrapper.addEventListener('dragleave', (e) => {
      itemWrapper.style.borderTop = 'none';
      itemWrapper.style.borderBottom = 'none';
    });

    itemWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      itemWrapper.style.borderTop = 'none';
      itemWrapper.style.borderBottom = 'none';
      
      const rect = itemWrapper.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const insertAfter = e.clientY >= mid;
      
      handleDropOnItem(el.id, insertAfter);
    });
    
    container.appendChild(itemWrapper);
    
    if (el.type === 'columns') {
        const zones = itemWrapper.querySelectorAll('.column-zone');
        zones.forEach((zone, index) => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.backgroundColor = '#eef2ff';
                zone.style.borderColor = '#4f46e5';
            });
            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.backgroundColor = 'transparent';
                zone.style.borderColor = '#ccc';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.backgroundColor = 'transparent';
                zone.style.borderColor = '#ccc';
                handleDropInColumn(el.id, index);
            });
            
            const colList = el.columns && el.columns[index] ? el.columns[index] : [];
            colList.forEach(childEl => {
                renderElement(childEl, zone);
            });
        });
    }
}

function handleDropOnItem(targetId, insertAfter) {
  const targetPath = findElementPath(targetId, elements);
  if (!targetPath) return;

  let itemToInsert = null;
  if (dragSourceType) {
     itemToInsert = getDefaultElement(dragSourceType);
     selectedId = itemToInsert.id;
  } else if (dragSourceId) {
     if (dragSourceId === targetId) return;
     if (isChild(dragSourceId, targetId)) return;
     
     const sourcePath = findElementPath(dragSourceId, elements);
     if (sourcePath) {
         itemToInsert = sourcePath.list.splice(sourcePath.index, 1)[0];
     }
  }
  
  if (itemToInsert) {
      const targetPathNew = findElementPath(targetId, elements);
      if (targetPathNew) {
          const insertIdx = insertAfter ? targetPathNew.index + 1 : targetPathNew.index;
          targetPathNew.list.splice(insertIdx, 0, itemToInsert);
      } else {
          elements.push(itemToInsert);
      }
  }
  
  dragSourceType = null;
  dragSourceId = null;
  renderCanvas();
  renderProperties();
}

function handleDropInColumn(parentId, colIndex) {
  const parent = findElementById(parentId);
  if (!parent) return;

  let itemToInsert = null;
  if (dragSourceType) {
     itemToInsert = getDefaultElement(dragSourceType);
     selectedId = itemToInsert.id;
  } else if (dragSourceId) {
     if (dragSourceId === parentId) return;
     if (isChild(dragSourceId, parentId)) return;
     
     const sourcePath = findElementPath(dragSourceId, elements);
     if (sourcePath) {
         itemToInsert = sourcePath.list.splice(sourcePath.index, 1)[0];
     }
  }
  
  if (itemToInsert) {
      if (!parent.columns) parent.columns = [[], []];
      parent.columns[colIndex].push(itemToInsert);
  }
  
  dragSourceType = null;
  dragSourceId = null;
  renderCanvas();
  renderProperties();
}

function renderProperties() {
  if (!selectedId) {
    propertiesContent.innerHTML = `
      <div class="space-y-6">
        <h3 class="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Global Settings</h3>
        <div class="space-y-3">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Background Color</label>
          <div class="flex items-center gap-2">
            <input type="color" id="global-bg-color" value="${config.backgroundColor}" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            <input type="text" id="global-bg-text" value="${config.backgroundColor}" class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
        <div class="space-y-3">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Font Family</label>
          <select id="global-font" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="Arial, sans-serif" ${config.fontFamily.includes('Arial') ? 'selected' : ''}>Arial</option>
            <option value="Georgia, serif" ${config.fontFamily.includes('Georgia') ? 'selected' : ''}>Georgia</option>
            <option value="Tahoma, sans-serif" ${config.fontFamily.includes('Tahoma') ? 'selected' : ''}>Tahoma</option>
          </select>
        </div>
        <div class="text-sm text-gray-400 mt-8 text-center pt-8 border-t border-gray-100">Select an element to edit properties</div>
      </div>
    `;
    
    document.getElementById('global-bg-color')?.addEventListener('input', (e) => { config.backgroundColor = e.target.value; document.getElementById('global-bg-text').value = e.target.value; renderCanvas(); });
    document.getElementById('global-bg-text')?.addEventListener('input', (e) => { config.backgroundColor = e.target.value; document.getElementById('global-bg-color').value = e.target.value; renderCanvas(); });
    document.getElementById('global-font')?.addEventListener('change', (e) => { config.fontFamily = e.target.value; renderCanvas(); });
    return;
  }

  const el = findElementById(selectedId);
  if (!el) return;

  let html = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-[10px] font-bold text-gray-800 uppercase tracking-wider">${el.type} Settings</h3>
      </div>
  `;

  // Content input
  if (el.type !== 'divider' && el.type !== 'columns') {
    const label = el.type === 'image' ? 'Image URL' : 'Content';
    const isTextarea = el.type === 'text';
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">${label}</label>
        ${isTextarea 
          ? `<textarea id="prop-content" class="w-full px-3 py-2 border border-gray-300 rounded text-sm min-h-[100px] focus:ring-1 focus:ring-indigo-500 outline-none">${el.content}</textarea>`
          : `<input type="text" id="prop-content" value="${el.content}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />`
        }
      </div>
    `;
  }

  // Styles
  html += `<div class="space-y-4 pt-4 border-t border-gray-100"><h3 class="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Styles</h3>`;

  if (el.styles.color !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Text Color</label>
        <div class="flex items-center gap-2">
          <input type="color" id="prop-color" value="${el.styles.color}" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input type="text" id="prop-color-text" value="${el.styles.color}" class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
    `;
  }

  if (el.styles.backgroundColor !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Background Color</label>
        <div class="flex items-center gap-2">
          <input type="color" id="prop-bg" value="${el.styles.backgroundColor}" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input type="text" id="prop-bg-text" value="${el.styles.backgroundColor}" class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
    `;
  }

  if (el.styles.fontSize !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Font Size</label>
        <input type="text" id="prop-font-size" value="${el.styles.fontSize}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
    `;
  }

  if (el.styles.textAlign !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Alignment</label>
        <select id="prop-align" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="left" ${el.styles.textAlign === 'left' ? 'selected' : ''}>Left</option>
          <option value="center" ${el.styles.textAlign === 'center' ? 'selected' : ''}>Center</option>
          <option value="right" ${el.styles.textAlign === 'right' ? 'selected' : ''}>Right</option>
        </select>
      </div>
    `;
  }

  if (el.styles.padding !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Padding</label>
        <input type="text" id="prop-padding" value="${el.styles.padding}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
    `;
  }

  if (el.type === 'image' && el.styles.width !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Width</label>
        <input type="text" id="prop-width" value="${el.styles.width}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
    `;
  }

  if (el.type === 'button' && el.styles.borderRadius !== undefined) {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Border Radius</label>
        <input type="text" id="prop-radius" value="${el.styles.borderRadius}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
    `;
  }

  if (el.type === 'divider') {
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Line Thickness</label>
        <input type="text" id="prop-border-width" value="${el.styles.borderTopWidth}" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Line Color</label>
        <div class="flex items-center gap-2">
          <input type="color" id="prop-border-color" value="${el.styles.borderTopColor}" class="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <input type="text" id="prop-border-color-text" value="${el.styles.borderTopColor}" class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
    `;
  }

  if (el.type === 'columns') {
    const colCount = el.columns ? el.columns.length : 2;
    html += `
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Number of Columns</label>
        <select id="prop-col-count" class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="2" ${colCount === 2 ? 'selected' : ''}>2 Columns</option>
          <option value="3" ${colCount === 3 ? 'selected' : ''}>3 Columns</option>
          <option value="4" ${colCount === 4 ? 'selected' : ''}>4 Columns</option>
        </select>
      </div>
    `;
  }

  html += `</div></div>`;
  propertiesContent.innerHTML = html;

  // Event listeners for properties
  const updateProp = (key, value) => {
    const item = findElementById(selectedId);
    if (item) {
      if (key === 'content') item.content = value;
      else item.styles[key] = value;
      renderCanvas();
    }
  };

  document.getElementById('prop-content')?.addEventListener('input', (e) => updateProp('content', e.target.value));
  
  if (el.styles.color !== undefined) {
    document.getElementById('prop-color')?.addEventListener('input', (e) => { updateProp('color', e.target.value); document.getElementById('prop-color-text').value = e.target.value; });
    document.getElementById('prop-color-text')?.addEventListener('input', (e) => { updateProp('color', e.target.value); document.getElementById('prop-color').value = e.target.value; });
  }
  
  if (el.styles.backgroundColor !== undefined) {
    document.getElementById('prop-bg')?.addEventListener('input', (e) => { updateProp('backgroundColor', e.target.value); document.getElementById('prop-bg-text').value = e.target.value; });
    document.getElementById('prop-bg-text')?.addEventListener('input', (e) => { updateProp('backgroundColor', e.target.value); document.getElementById('prop-bg').value = e.target.value; });
  }

  document.getElementById('prop-font-size')?.addEventListener('input', (e) => updateProp('fontSize', e.target.value));
  document.getElementById('prop-align')?.addEventListener('change', (e) => updateProp('textAlign', e.target.value));
  document.getElementById('prop-padding')?.addEventListener('input', (e) => updateProp('padding', e.target.value));
  document.getElementById('prop-width')?.addEventListener('input', (e) => updateProp('width', e.target.value));
  document.getElementById('prop-radius')?.addEventListener('input', (e) => updateProp('borderRadius', e.target.value));
  
  if (el.type === 'divider') {
    document.getElementById('prop-border-width')?.addEventListener('input', (e) => updateProp('borderTopWidth', e.target.value));
    document.getElementById('prop-border-color')?.addEventListener('input', (e) => { updateProp('borderTopColor', e.target.value); document.getElementById('prop-border-color-text').value = e.target.value; });
    document.getElementById('prop-border-color-text')?.addEventListener('input', (e) => { updateProp('borderTopColor', e.target.value); document.getElementById('prop-border-color').value = e.target.value; });
  }

  if (el.type === 'columns') {
    document.getElementById('prop-col-count')?.addEventListener('change', (e) => {
      const item = findElementById(selectedId);
      if (item) {
        const oldCols = item.columns || [];
        const newCount = parseInt(e.target.value, 10);
        const newCols = [];
        for (let i = 0; i < newCount; i++) {
          newCols.push(oldCols[i] || []);
        }
        item.columns = newCols;
        renderCanvas();
      }
    });
  }
}

function getEmailHtmlRecursive(list) {
    return list.map(el => {
        if (el.type === 'columns') {
            const colCount = el.columns ? el.columns.length : 2;
            const widthPct = Math.floor(100 / colCount);
            let colsHtml = '';
            for (let i = 0; i < colCount; i++) {
                colsHtml += `<td width="${widthPct}%" valign="top" style="padding: 10px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                        ${getEmailHtmlRecursive(el.columns && el.columns[i] ? el.columns[i] : [])}
                    </table>
                </td>`;
            }
            return `<tr><td style="padding: ${el.styles.padding || '0'};"><table width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${colsHtml}</tr></table></td></tr>`;
        } else {
            let btnHtml = '';
            if (el.type === 'button') {
                const btnStyle = { ...el.styles };
                const align = btnStyle.textAlign || 'center';
                delete btnStyle.textAlign;
                let btnStyleStr = Object.entries(btnStyle).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
                btnHtml = `<tr><td align="${align}" style="padding: ${el.styles.padding || '0'};"><a href="#" target="_blank" style="${btnStyleStr}">${el.content}</a></td></tr>`;
                return btnHtml;
            }
            return `<tr><td>${getElementHtml(el)}</td></tr>`;
        }
    }).join('\\n');
}

function generateEmailHtmlStr() {
  const emailBody = getEmailHtmlRecursive(elements);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin: 0; padding: 0; background-color: ${config.backgroundColor}; font-family: ${config.fontFamily}; }
  table { border-spacing: 0; }
  .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; }
</style>
</head>
<body>
  <center style="width: 100%; background-color: ${config.backgroundColor};">
    <table class="main" width="100%">
      ${emailBody}
    </table>
  </center>
</body>
</html>
  `.trim();
}

// --- SETUP EVENT LISTENERS ---
sidebarBlocks.forEach(block => {
  block.addEventListener('dragstart', (e) => {
    dragSourceType = block.getAttribute('data-type');
    e.dataTransfer.setData('text/plain', 'sidebar');
  });
  block.addEventListener('dragend', () => {
    dragSourceType = null;
  });
});

canvasEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (elements.length === 0) {
    canvasEl.classList.add('drag-over');
  }
});

canvasEl.addEventListener('dragleave', () => {
  canvasEl.classList.remove('drag-over');
});

canvasEl.addEventListener('drop', (e) => {
  e.preventDefault();
  canvasEl.classList.remove('drag-over');
  
  if (elements.length === 0 && dragSourceType) {
    const newElement = getDefaultElement(dragSourceType);
    elements.push(newElement);
    selectedId = newElement.id;
    dragSourceType = null;
    renderCanvas();
    renderProperties();
  } else if (elements.length > 0 && (dragSourceType || dragSourceId)) {
    let itemToInsert = null;
    if (dragSourceType) {
       itemToInsert = getDefaultElement(dragSourceType);
       selectedId = itemToInsert.id;
    } else if (dragSourceId) {
       const sourcePath = findElementPath(dragSourceId, elements);
       if (sourcePath) {
           itemToInsert = sourcePath.list.splice(sourcePath.index, 1)[0];
       }
    }
    if (itemToInsert) {
       elements.push(itemToInsert);
    }
    dragSourceType = null;
    dragSourceId = null;
    renderCanvas();
    renderProperties();
  }
});

canvasWrapper.addEventListener('click', () => {
  selectedId = null;
  renderCanvas();
  renderProperties();
});

btnDesktop.addEventListener('click', () => {
  previewMode = 'desktop';
  btnDesktop.classList.replace('text-gray-500', 'text-gray-700');
  btnDesktop.classList.replace('bg-transparent', 'bg-white');
  btnDesktop.classList.add('shadow-sm');
  btnMobile.classList.replace('text-gray-700', 'text-gray-500');
  btnMobile.classList.replace('bg-white', 'bg-transparent');
  btnMobile.classList.remove('shadow-sm');
  canvasEl.classList.remove('max-w-[375px]');
  canvasEl.classList.add('max-w-2xl');
});

btnMobile.addEventListener('click', () => {
  previewMode = 'mobile';
  btnMobile.classList.replace('text-gray-500', 'text-gray-700');
  btnMobile.classList.replace('bg-transparent', 'bg-white');
  btnMobile.classList.add('shadow-sm');
  btnDesktop.classList.replace('text-gray-700', 'text-gray-500');
  btnDesktop.classList.replace('bg-white', 'bg-transparent');
  btnDesktop.classList.remove('shadow-sm');
  canvasEl.classList.remove('max-w-2xl');
  canvasEl.classList.add('max-w-[375px]');
});

btnExportJson.addEventListener('click', () => {
  const data = JSON.stringify({ elements, config }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'email-template.json';
  a.click();
  URL.revokeObjectURL(url);
});

btnImportJson.addEventListener('click', () => inputImportJson.click());

inputImportJson.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.elements) elements = data.elements;
      if (data.config) config = data.config;
      selectedId = null;
      renderCanvas();
      renderProperties();
    } catch (err) {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
});

btnExportHtml.addEventListener('click', () => {
  const html = generateEmailHtmlStr();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'email.html';
  a.click();
  URL.revokeObjectURL(url);
});

// Init
renderCanvas();
renderProperties();
