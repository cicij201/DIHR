const mainList = document.getElementById('main-drag-list');
const archiveList = document.getElementById('archive-drag-list');
const archiveCount = document.getElementById('archive-count');
const archiveToggleBtn = document.getElementById('archive-toggle-btn');

// 데이터 로드
let boardData = JSON.parse(localStorage.getItem('bizProjectBoard')) || [
    { title: '신규 홈페이지 구축', items: ['시안 확정', '기능 명세서'], collapsed: false, archived: false },
    { title: '사내 교육 운영', items: ['강사 섭외'], collapsed: false, archived: false }
];

// 드래그 상태
let draggedItemInfo = null;

// 1. 화면 렌더링
function renderDOM() {
    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        
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
                <ul class="drag-item-list" id="list-${colIdx}">
                </ul>
            </div>
            <div class="add-btn-group">
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 세부 항목 추가</button>
            </div>
        `;

        // 아이템 추가 및 드래그 이벤트 연결
        const listEl = colNode.querySelector('.drag-item-list');
        column.items.forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.textContent = item;
            itemEl.draggable = true;
            itemEl.contentEditable = true;
            
            // 드래그 시작
            itemEl.addEventListener('dragstart', () => {
                draggedItemInfo = { colIdx, itemIdx };
            });

            // 아이템 수정
            itemEl.addEventListener('blur', () => {
                updateItem(colIdx, itemIdx, itemEl.textContent);
            });

            listEl.appendChild(itemEl);
        });

        // 컬럼 드롭 이벤트 연결
        listEl.addEventListener('dragover', (e) => e.preventDefault());
        listEl.addEventListener('dragenter', () => listEl.classList.add('over'));
        listEl.addEventListener('dragleave', () => listEl.classList.remove('over'));
        listEl.addEventListener('drop', (e) => {
            e.preventDefault();
            listEl.classList.remove('over');
            onDropItem(colIdx);
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

// 2. 기능 제어 함수
function onDropItem(targetColIdx) {
    if (draggedItemInfo) {
        const { colIdx, itemIdx } = draggedItemInfo;
        const item = boardData[colIdx].items.splice(itemIdx, 1)[0];
        boardData[targetColIdx].items.push(item);
        draggedItemInfo = null;
        renderDOM();
    }
}

function addNewColumn() {
    const title = prompt('업무 명칭을 입력하세요:');
    if (title) {
        boardData.push({ title, items: [], collapsed: false, archived: false });
        renderDOM();
    }
}

function toggleCollapse(idx) {
    boardData[idx].collapsed = !boardData[idx].collapsed;
    renderDOM();
}

function toggleArchiveStatus(idx) {
    boardData[idx].archived = !boardData[idx].archived;
    renderDOM();
}

function deleteColumn(idx) {
    if (confirm('이 보드를 삭제할까요?')) {
        boardData.splice(idx, 1);
        renderDOM();
    }
}

function addItem(colIdx) {
    boardData[colIdx].items.push('새 항목');
    renderDOM();
}

function updateTitle(idx, text) {
    boardData[idx].title = text || '제목 없음';
    localStorage.setItem('bizProjectBoard', JSON.stringify(boardData));
}

function updateItem(cIdx, iIdx, text) {
    if (!text.trim()) boardData[cIdx].items.splice(iIdx, 1);
    else boardData[cIdx].items[iIdx] = text;
    localStorage.setItem('bizProjectBoard', JSON.stringify(boardData));
}

// 보관함 열기/닫기
archiveToggleBtn.addEventListener('click', () => {
    document.getElementById('archive-section').classList.toggle('open');
});

// 초기 실행
renderDOM();
