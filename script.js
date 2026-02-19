const mainDragList = document.getElementById('main-drag-list');

// 보드 데이터 구조: [{ title: '...', items: [...] }, ...]
let boardData = [];
let updatedOnLoad = false;

// 드래그 관련
let draggedItem;
let dragging = false;
let currentColumnIndex;

// 1. 초기 데이터 로드
function getSavedColumns() {
    if (localStorage.getItem('droppiBoardData')) {
        boardData = JSON.parse(localStorage.getItem('droppiBoardData'));
    } else {
        // 기본 보드 설정
        boardData = [
            { title: 'To Do', items: ['코드 작성하기', '문서 읽기'] },
            { title: 'Doing', items: ['칸반 프로젝트 개발'] }
        ];
    }
}

// 2. 데이터 저장
function updateSavedColumns() {
    localStorage.setItem('droppiBoardData', JSON.stringify(boardData));
}

// 3. 컬럼 추가
function addNewColumn() {
    boardData.push({ title: 'New Column', items: [] });
    updateDOM();
}

// 4. 컬럼 삭제
function deleteColumn(index) {
    if (confirm(`'${boardData[index].title}' 컬럼을 삭제하시겠습니까?`)) {
        boardData.splice(index, 1);
        updateDOM();
    }
}

// 5. 컬럼 제목 수정
function updateTitle(index, newTitle) {
    boardData[index].title = newTitle;
    updateSavedColumns();
}

// 6. 아이템 엘리먼트 생성
function createItemEl(columnEl, colIndex, itemText, itemIndex) {
    const listEl = document.createElement('li');
    listEl.classList.add('drag-item');
    listEl.textContent = itemText;
    listEl.draggable = true;
    listEl.contentEditable = true;

    // 아이템 드래그 시작
    listEl.ondragstart = (e) => {
        draggedItem = e.target;
        dragging = true;
    };

    // 아이템 수정 완료
    listEl.onblur = () => {
        if (!listEl.textContent.trim()) {
            boardData[colIndex].items.splice(itemIndex, 1);
        } else {
            boardData[colIndex].items[itemIndex] = listEl.textContent;
        }
        updateDOM();
    };

    columnEl.appendChild(listEl);
}

// 7. 화면 렌더링 (핵심 기능)
function updateDOM() {
    if (!updatedOnLoad) {
        getSavedColumns();
        updatedOnLoad = true;
    }
    
    mainDragList.innerHTML = '';

    boardData.forEach((column, colIndex) => {
        const colNode = document.createElement('li');
        colNode.classList.add('drag-column');
        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" onblur="updateTitle(${colIndex}, this.textContent)">${column.title}</h1>
                <button class="delete-col-btn" onclick="deleteColumn(${colIndex})">&times;</button>
            </div>
            <div class="custom-scroll">
                <ul class="drag-item-list" 
                    id="col-${colIndex}" 
                    ondrop="drop(event, ${colIndex})" 
                    ondragover="allowDrop(event)"
                    ondragenter="dragEnter(${colIndex})">
                </ul>
            </div>
            <div class="add-btn-group">
                <div class="add-btn" onclick="showInput(${colIndex})">+ Add Item</div>
                <div class="add-btn solid" style="display:none;" onclick="hideInput(${colIndex})">Save Item</div>
            </div>
            <div class="add-container" style="display:none;">
                <div class="add-item" contenteditable="true"></div>
            </div>
        `;

        mainDragList.appendChild(colNode);

        // 해당 컬럼의 아이템들 생성
        const itemListEl = document.getElementById(`col-${colIndex}`);
        column.items.forEach((item, itemIndex) => {
            createItemEl(itemListEl, colIndex, item, itemIndex);
        });
    });

    updateSavedColumns();
}

// 아이템 입력창 제어
function showInput(index) {
    document.querySelectorAll('.add-btn:not(.solid)')[index].style.display = 'none';
    document.querySelectorAll('.solid')[index].style.display = 'flex';
    document.querySelectorAll('.add-container')[index].style.display = 'block';
}

function hideInput(index) {
    const addContainer = document.querySelectorAll('.add-container')[index];
    const itemText = addContainer.querySelector('.add-item').textContent;
    
    if (itemText.trim()) {
        boardData[index].items.push(itemText);
    }
    
    addContainer.querySelector('.add-item').textContent = '';
    updateDOM();
}

// 드래그 앤 드롭 로직
function allowDrop(e) { e.preventDefault(); }

function dragEnter(index) {
    currentColumnIndex = index;
    const lists = document.querySelectorAll('.drag-item-list');
    lists.forEach(list => list.classList.remove('over'));
    lists[index].classList.add('over');
}

function drop(e) {
    e.preventDefault();
    dragging = false;

    // 모든 리스트에서 'over' 클래스 제거
    document.querySelectorAll('.drag-item-list').forEach(l => l.classList.remove('over'));

    // 현재 DOM 구조를 바탕으로 데이터 재구성 (Rebuild Arrays)
    const allLists = document.querySelectorAll('.drag-item-list');
    boardData.forEach((col, i) => {
        boardData[i].items = Array.from(allLists[i].children).map(li => li.textContent);
    });

    updateDOM();
}

// 실행
updateDOM();
