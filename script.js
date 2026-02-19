const mainDragList = document.getElementById('main-drag-list');

// 1. 데이터 로드 (로컬 스토리지 또는 기본값)
let boardData = JSON.parse(localStorage.getItem('droppiProData')) || [
    { title: '📝 업무 백로그', items: ['시장 분석 보고서', '신규 기획안 작성'] },
    { title: '⚙️ 진행 중', items: ['메인 페이지 퍼블리싱'] },
    { title: '✅ 완료됨', items: ['기존 버그 수정'] }
];

let draggedItem = null;

// 2. 화면 그리기 (렌더링)
function renderDOM() {
    mainDragList.innerHTML = '';

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = 'drag-column';
        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" onblur="updateTitle(${colIdx}, this.textContent)">${column.title}</h1>
                <button class="delete-btn" onclick="deleteColumn(${colIdx})">×</button>
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
                <button class="add-item-btn" onclick="addItem(${colIdx})">+ 업무 추가</button>
            </div>
        `;
        mainDragList.appendChild(colNode);
    });
    localStorage.setItem('droppiProData', JSON.stringify(boardData));
}

// 3. 기능 함수들
function addNewColumn() {
    boardData.push({ title: '새 업무 단계', items: [] });
    renderDOM();
}

function deleteColumn(idx) {
    if (confirm('이 단계를 삭제하시겠습니까?')) {
        boardData.splice(idx, 1);
        renderDOM();
    }
}

function addItem(colIdx) {
    boardData[colIdx].items.push('업무 내용을 입력하세요');
    renderDOM();
}

function updateTitle(idx, text) {
    boardData[idx].title = text;
    localStorage.setItem('droppiProData', JSON.stringify(boardData));
}

function updateItem(colIdx, itemIdx, text) {
    if (!text.trim()) {
        boardData[colIndex].items.splice(itemIndex, 1);
    } else {
        boardData[colIdx].items[itemIndex] = text;
    }
    localStorage.setItem('droppiProData', JSON.stringify(boardData));
}

// 4. 드래그 앤 드롭 로직
function drag(e, colIdx, itemIdx) {
    draggedItem = { colIdx, itemIdx };
}

function allowDrop(e) { e.preventDefault(); }

function drop(e, targetColIdx) {
    e.preventDefault();
    const { colIdx, itemIdx } = draggedItem;
    const item = boardData[colIdx].items.splice(itemIndex, 1)[0];
    boardData[targetColIdx].items.push(item);
    renderDOM();
}

// 초기 로드
renderDOM();
