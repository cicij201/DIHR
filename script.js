const mainList = document.getElementById('main-drag-list');
const archiveList = document.getElementById('archive-drag-list');
const archiveCount = document.getElementById('archive-count');
const archiveToggleBtn = document.getElementById('archive-toggle-btn');
const archiveSection = document.getElementById('archive-section');

let boardData = JSON.parse(localStorage.getItem('bizBoardFinal')) || [
    { title: '신규 프로젝트', items: ['일정 수립'], collapsed: false, archived: false, color: '#3b82f6' },
    { title: '사내 업무', items: ['회의록'], collapsed: false, archived: false, color: '#10b981' }
];

let draggedItem = null;   // {colIdx, itemIdx}
let draggedColumn = null; // colIdx

function renderDOM() {
    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn">${column.collapsed ? '▶' : '▼'}</button>
                    <button class="icon-btn archive-btn">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                    `<div class="color-dot" style="background:${c}" onclick="changeColor(${colIdx}, '${c}')"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll">
                <ul class="drag-item-list" data-col="${colIdx}"></ul>
            </div>
            <div class="add-btn-group">
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 세부 할 일 추가</button>
            </div>
        `;

        // 보드(컬럼) 드래그 이벤트
        colNode.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('drag-item')) return;
            draggedColumn = colIdx;
            colNode.classList.add('dragging-col');
        });

        colNode.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedColumn === null || draggedColumn === colIdx) return;
            const temp = boardData[draggedColumn];
            boardData.splice(draggedColumn, 1);
            boardData.splice(colIdx, 0, temp);
            draggedColumn = colIdx;
            renderDOM();
        });

        colNode.addEventListener('dragend', () => {
            draggedColumn = null;
            colNode.classList.remove('dragging-col');
            saveData();
        });

        // 아이템 리스트 렌더링
        const itemListEl = colNode.querySelector('.drag-item-list');
        column.items.forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.textContent = item;
            itemEl.draggable = true;
            itemEl.contentEditable = true;

            itemEl.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedItem = { colIdx, itemIdx };
                itemEl.classList.add('dragging-item');
            });

            itemEl.addEventListener('dragend', () => {
                draggedItem = null;
                itemEl.classList.remove('dragging-item');
            });

            itemEl.addEventListener('blur', () => {
                boardData[colIdx].items[itemIdx] = itemEl.textContent;
                saveData();
            });

            itemListEl.appendChild(itemEl);
        });

        // 아이템 드롭 처리
        itemListEl.addEventListener('dragover', (e) => e.preventDefault());
        itemListEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedItem) {
                const itemValue = boardData[draggedItem.colIdx].items.splice(draggedItem.itemIdx, 1)[0];
                boardData[colIdx].items.push(itemValue);
                draggedItem = null;
                renderDOM();
            }
        });

        // 제목 수정
        colNode.querySelector('.col-title').onblur = (e) => {
            boardData[colIdx].title = e.target.textContent;
            saveData();
        };

        // 버튼 이벤트
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; renderDOM(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; renderDOM(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제할까요?')) { boardData.splice(colIdx, 1); renderDOM(); } };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else { mainList.appendChild(colNode); }
    });

    archiveCount.textContent = archCount;
    saveData();
}

function addNewColumn() {
    const title = prompt('업무 제목:');
    if (title) {
        boardData.push({ title, items: [], collapsed: false, archived: false, color: '#94a3b8' });
        renderDOM();
    }
}

function addItem(colIdx) {
    boardData[colIdx].items.push('새 할 일');
    renderDOM();
}

function changeColor(idx, color) {
    boardData[idx].color = color;
    renderDOM();
}

function saveData() { localStorage.setItem('bizBoardFinal', JSON.stringify(boardData)); }

// 보관함 토글 (중복 실행 방지)
archiveToggleBtn.onclick = () => {
    archiveSection.classList.toggle('open');
};

renderDOM();
