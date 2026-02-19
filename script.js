const mainList = document.getElementById('main-drag-list');
const archiveList = document.getElementById('archive-drag-list');
const archiveCount = document.getElementById('archive-count');
const archiveToggleBtn = document.getElementById('archive-toggle-btn');

let boardData = JSON.parse(localStorage.getItem('bizProjectBoard')) || [
    { title: '신규 홈페이지 구축', items: ['시안 확정', '기능 명세서'], collapsed: false, archived: false },
    { title: '사내 교육 운영', items: ['강사 섭외'], collapsed: false, archived: false }
];

let draggedItemInfo = null;   // 아이템 드래그 정보
let draggedColumnIdx = null; // 컬럼 드래그 정보

function renderDOM() {
    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.draggable = true; // 컬럼 자체 드래그 허용
        
        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" onblur="updateTitle(${colIdx}, this.textContent)">${column.title}</h1>
                <div class="header-btns">
                    <button class="icon-btn" onclick="toggleCollapse(${colIdx})">${column.collapsed ? '▶' : '▼'}</button>
                    <button class="icon-btn" onclick="toggleArchiveStatus(${colIdx})">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn" onclick="deleteColumn(${colIdx})">×</button>
                </div>
            </div>
            <div class="custom-scroll">
                <ul class="drag-item-list" id="list-${colIdx}"></ul>
            </div>
            <div class="add-btn-group">
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 세부 항목 추가</button>
            </div>
        `;

        // --- 1. 컬럼 드래그 이벤트 (컬럼 순서 변경) ---
        colNode.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('drag-item')) return; // 아이템 드래그 시 무시
            draggedColumnIdx = colIdx;
            colNode.classList.add('dragging');
        });

        colNode.addEventListener('dragend', () => {
            colNode.classList.remove('dragging');
            draggedColumnIdx = null;
        });

        colNode.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedColumnIdx === null || draggedColumnIdx === colIdx) return;
            
            // 컬럼 순서 교체 로직
            const temp = boardData[draggedColumnIdx];
            boardData.splice(draggedColumnIdx, 1);
            boardData.splice(colIdx, 0, temp);
            draggedColumnIdx = colIdx;
            renderDOM(); // 순서 바뀔 때마다 즉시 갱신
        });

        // --- 2. 아이템 드래그 이벤트 (기존 로직 유지) ---
        const listEl = colNode.querySelector('.drag-item-list');
        column.items.forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.textContent = item;
            itemEl.draggable = true;
            itemEl.contentEditable = true;
            
            itemEl.addEventListener('dragstart', (e) => {
                e.stopPropagation(); // 컬럼 드래그 이벤트가 발생하지 않도록 차단
                draggedItemInfo = { colIdx, itemIdx };
            });

            itemEl.addEventListener('blur', () => updateItem(colIdx, itemIdx, itemEl.textContent));
            listEl.appendChild(itemEl);
        });

        // 아이템 드롭 영역 설정
        listEl.addEventListener('dragover', (e) => e.preventDefault());
        listEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedItemInfo) {
                const { colIdx: fromCol, itemIdx: fromItem } = draggedItemInfo;
                const item = boardData[fromCol].items.splice(fromItem, 1)[0];
                boardData[colIdx].items.push(item);
                draggedItemInfo = null;
                renderDOM();
            }
        });

        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });

    archiveCount.textContent = archCount;
    localStorage.setItem('bizProjectBoard', JSON.stringify(boardData));
}

// 나머지 기능 함수 (이전과 동일)
function addNewColumn() {
    const title = prompt('업무 명칭을 입력하세요:');
    if (title) { boardData.push({ title, items: [], collapsed: false, archived: false }); renderDOM(); }
}
function toggleCollapse(idx) { boardData[idx].collapsed = !boardData[idx].collapsed; renderDOM(); }
function toggleArchiveStatus(idx) { boardData[idx].archived = !boardData[idx].archived; renderDOM(); }
function deleteColumn(idx) { if (confirm('삭제할까요?')) { boardData.splice(idx, 1); renderDOM(); } }
function addItem(colIdx) { boardData[colIdx].items.push('새 항목'); renderDOM(); }
function updateTitle(idx, text) { boardData[idx].title = text || '제목 없음'; saveData(); }
function updateItem(cIdx, iIdx, text) { 
    if (!text.trim()) boardData[cIdx].items.splice(iIdx, 1);
    else boardData[cIdx].items[iIdx] = text; 
    saveData(); 
}
function saveData() { localStorage.setItem('bizProjectBoard', JSON.stringify(boardData)); }
archiveToggleBtn.addEventListener('click', () => document.getElementById('archive-section').classList.toggle('open'));

renderDOM();
