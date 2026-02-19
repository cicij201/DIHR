const mainList = document.getElementById('main-drag-list');
const archiveList = document.getElementById('archive-drag-list');
const archiveCount = document.getElementById('archive-count');

// 1. 데이터 로드
let boardData = JSON.parse(localStorage.getItem('myWorkBoard')) || [
    { title: '신규 홈페이지 구축', items: ['시안 확정', '기능 명세서 작성'], collapsed: false, archived: false },
    { title: '사내 교육 운영', items: ['강사 섭외', '장소 예약'], collapsed: false, archived: false }
];

// 드래그 상태 관리 객체
let draggedItemInfo = null;

// 2. 화면 렌더링
function renderDOM() {
    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archivedNum = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        
        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" onblur="updateTitle(${colIdx}, this.textContent)">${column.title}</h1>
                <div class="header-btns">
                    <button class="icon-btn" onclick="toggleCollapse(${colIdx})" title="접기/펴기">${column.collapsed ? '▶' : '▼'}</button>
                    <button class="icon-btn" onclick="toggleArchiveStatus(${colIdx})" title="보관/복구">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn" onclick="deleteColumn(${colIdx})" title="삭제">×</button>
                </div>
            </div>
            <div class="custom-scroll">
                <ul class="drag-item-list" id="list-${colIdx}" 
                    ondrop="drop(event, ${colIdx})" 
                    ondragover="allowDrop(event)">
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
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 세부 할 일 추가</button>
            </div>
        `;

        if (column.archived) {
            archiveList.appendChild(colNode);
            archivedNum++;
        } else {
            mainList.appendChild(colNode);
        }
    });

    archiveCount.textContent = archivedNum;
    saveData();
}

// 3. 기능 제어 함수
function addNewColumn() {
    const title = prompt('업무 명칭을 입력하세요:', '새로운 업무');
    if (title) {
        boardData.push({ title, items: [], collapsed: false, archived: false });
        renderDOM();
    }
}

function deleteColumn(idx) {
    if (confirm('이 업무 보드를 영구 삭제하시겠습니까?')) {
        boardData.splice(idx, 1);
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

function toggleArchive() {
    document.getElementById('archive-section').classList.toggle('open');
}

function addItem(colIdx) {
    boardData[colIdx].items.push('새 할 일');
    renderDOM();
}

function updateTitle(idx, text) { 
    boardData[idx].title = text || '제목 없음'; 
    saveData(); 
}

function updateItem(cIdx, iIdx, text) { 
    if (!text.trim()) {
        boardData[cIdx].items.splice(iIdx, 1);
    } else {
        boardData[cIdx].items[iIdx] = text; 
    }
    renderDOM(); 
}

function saveData() { 
    localStorage.setItem('myWorkBoard', JSON.stringify(boardData)); 
}

// 4. 드래그 앤 드롭 핵심 로직 (수정됨)
function drag(e, colIdx, itemIdx) {
    draggedItemInfo = { colIdx, itemIdx };
}

function allowDrop(e) {
    e.preventDefault(); // 드롭 허용을 위해 필수
}

function drop(e, targetColIdx) {
    e.preventDefault();
    
    if (draggedItemInfo) {
        const { colIdx, itemIdx } = draggedItemInfo;
        
        // 원본 배열에서 아이템 추출
        const item = boardData[colIdx].items.splice(itemIdx, 1)[0];
        
        // 타겟 배열에 아이템 삽입
        boardData[targetColIdx].items.push(item);
        
        // 상태 초기화 및 화면 갱신
        draggedItemInfo = null;
        renderDOM();
    }
}

// 초기 로드
renderDOM();
