const mainList = document.getElementById('main-drag-list');
const archiveList = document.getElementById('archive-drag-list');

// 데이터 로드 (collapsed: 접힘 여부, archived: 보관 여부 추가)
let boardData = JSON.parse(localStorage.getItem('bizBoardData')) || [
    { title: '1번', items: ['제안서 검토'], collapsed: false, archived: false },
    { title: '2번', items: ['시스템 최적화'], collapsed: false, archived: false },
    { title: '3번', items: ['정기 업데이트'], collapsed: false, archived: true }
];

let draggedItem = null;

function renderDOM() {
    mainList.innerHTML = '';
    archiveList.innerHTML = '';

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        
        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" onblur="updateTitle(${colIdx}, this.textContent)">${column.title}</h1>
                <div class="header-btns">
                    <button class="icon-btn" onclick="toggleCollapse(${colIdx})">${column.collapsed ? '▶' : '▼'}</button>
                    <button class="icon-btn" onclick="moveToArchive(${colIdx})">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn" onclick="deleteColumn(${colIdx})">×</button>
                </div>
            </div>
            <div class="custom-scroll">
                <ul class="drag-item-list" id="list-${colIdx}" ondrop="drop(event, ${colIdx})" ondragover="allowDrop(event)">
                    ${column.items.map((item, itemIdx) => `
                        <li class="drag-item" draggable="true" contenteditable="true"
                            ondragstart="drag(event, ${colIdx}, ${itemIdx})"
                            onblur="updateItem(${colIdx}, ${itemIdx}, this.textContent)">
                            ${item}
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="add-btn-group">
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 추가</button>
            </div>
        `;

        if (column.archived) {
            archiveList.appendChild(colNode);
        } else {
            mainList.appendChild(colNode);
        }
    });
    localStorage.setItem('bizBoardData', JSON.stringify(boardData));
}

// --- 보드 제어 함수 ---

function toggleCollapse(idx) {
    boardData[idx].collapsed = !boardData[idx].collapsed;
    renderDOM();
}

function moveToArchive(idx) {
    boardData[idx].archived = !boardData[idx].archived;
    renderDOM();
}

function toggleArchive() {
    document.querySelector('.archive-section').classList.toggle('open');
}

function addNewColumn() {
    boardData.push({ title: '새 업무 단계', items: [], collapsed: false, archived: false });
    renderDOM();
}

function deleteColumn(idx) {
    if (confirm('이 단계를 완전히 삭제할까요?')) {
        boardData.splice(idx, 1);
        renderDOM();
    }
}

function addItem(colIdx) {
    boardData[colIdx].items.push('업무 내용');
    renderDOM();
}

function updateTitle(idx, text) { boardData[idx].title = text; saveData(); }
function updateItem(cIdx, iIdx, text) { boardData[cIdx].items[iIdx] = text; saveData(); }
function saveData() { localStorage.setItem('bizBoardData', JSON.stringify(boardData)); }

// --- 드래그 앤 드롭 ---

function drag(e, colIdx, itemIdx) { draggedItem = { colIdx, itemIdx }; }
function allowDrop(e) { e.preventDefault(); }
function drop(e, targetColIdx) {
    e.preventDefault();
    const { colIdx, itemIdx } = draggedItem;
    const item = boardData[colIdx].items.splice(itemIdx, 1)[0];
    boardData[targetColIdx].items.push(item);
    renderDOM();
}

// 초기 로드
renderDOM();
