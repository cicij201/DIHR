    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. Firebase 설정
const firebaseConfig = { 
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", 
    projectId: "dihr-9bb0b" 
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false;

// 2. 서버 데이터 수신 및 실시간 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 드래그 중에는 화면 갱신 방지
    const data = snapshot.val();
    boardData = Array.isArray(data) ? data.map(col => ({
        ...col,
        items: Array.isArray(col.items) ? col.items.map(item => 
            typeof item === 'string' ? { text: item, color: '#ffffff' } : { ...item }
        ) : []
    })) : [];
    renderDOM();
});

// 3. 서버 저장 함수
function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

// 4. 메인 렌더링 함수
function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        // CSS 클래스 연계: 접힘 상태(.collapsed) 및 색상 변수(--column-color)
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="header-btns">
                    <button class="collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="archive-btn">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="padding:0 12px 10px; display:flex; gap:5px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => 
                    `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`
                ).join('')}
            </div>
            <ul class="drag-item-list" style="min-height:30px; list-style:none; padding:0;"></ul>
            <div class="add-btn-group" style="padding:10px;">
                <button class="add-item-btn" style="width:100%; cursor:pointer; padding:8px; border-radius:6px; border:1px dashed #ccc; background:#fff;">+ 할 일 추가</button>
            </div>
        `;

        // --- 보드 헤더 이벤트 (실시간 텍스트 보존) ---
        const titleNode = colNode.querySelector('.col-title');
        titleNode.oninput = (e) => { boardData[colIdx].title = e.target.textContent; };
        titleNode.onblur = () => saveToServer();

       // --- 보드 기능 버튼 (접기/보관/삭제) ---

// 1. 보드 접기/펴기
colNode.querySelector('.collapse-btn').onclick = (e) => {
    e.stopPropagation(); // 드래그 이벤트 간섭 방지
    boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
    saveToServer();
};

// 2. [수정 포인트] 보드 보관/복구 (📦 버튼)
colNode.querySelector('.archive-btn').onclick = (e) => {
    e.stopPropagation(); // 클릭 시 드래그가 시작되지 않도록 방지
    
    // 상태 반전 (true -> false / false -> true)
    boardData[colIdx].archived = !boardData[colIdx].archived;
    
    // 복구될 때 보드가 너무 멀리 있지 않게 접힘 상태 해제 (선택 사항)
    if (!boardData[colIdx].archived) {
        boardData[colIdx].collapsed = false;
    }
    
    saveToServer();
    console.log(`${colIdx}번 보드 상태 변경: archived = ${boardData[colIdx].archived}`);
};

// 3. 보드 삭제
colNode.querySelector('.delete-btn').onclick = (e) => {
    e.stopPropagation();
    if(confirm('보드를 영구 삭제하시겠습니까?')) {
        boardData.splice(colIdx, 1);
        saveToServer();
    }
};
        
        // 보드 색상 점 클릭
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 보드 자체 드래그 (순서 변경)
        colNode.ondragstart = (e) => {
            if(e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'col');
            e.dataTransfer.setData('from', colIdx);
        };

        // --- 카드(업무) 추가 이벤트 ---
        colNode.querySelector('.add-item-btn').onclick = () => {
            if (!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({ text: '새 업무를 입력하세요', color: '#ffffff' });
            saveToServer(); // 추가 즉시 서버 저장하여 초기화 방지
        };

        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none;">${item.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                    <button class="item-del-btn" style="border:none; color:red; cursor:pointer; background:none; margin-left:5px;">×</button>
                </div>
            `;

            // 카드 텍스트 실시간 반영 (초기화 방지 핵심)
            const textNode = itemEl.querySelector('.item-text');
            textNode.oninput = (e) => { boardData[colIdx].items[itemIdx].text = e.target.textContent; };
            textNode.onblur = () => saveToServer();

            // 카드 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            // 카드 개별 삭제
            itemEl.querySelector('.item-del-btn').onclick = (e) => {
                e.stopPropagation();
                boardData[colIdx].items.splice(itemIdx, 1);
                saveToServer();
            };

            // 카드 드래그 이동
            // --- 카드 드롭 처리 (중간 삽입 로직 추가) ---
            listEl.ondragover = (e) => {
                e.preventDefault();
    // 시각적 피드백을 주고 싶다면 여기서 힌트 요소를 표시할 수 있습니다.
            };

            listEl.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
    
                const type = e.dataTransfer.getData('type');
                if (type === 'item') {
                    const info = JSON.parse(e.dataTransfer.getData('info'));
                    const movingItem = boardData[info.fCol].items.splice(info.fIdx, 1)[0];

        // [핵심] 마우스 위치에 따른 삽입 인덱스 계산
                    const afterElement = getDragAfterElement(listEl, e.clientY);
                    const targetItems = boardData[colIdx].items || [];
        
                    if (afterElement == null) {
            // 아래에 아무 카드도 없으면 맨 뒤에 추가
                        targetItems.push(movingItem);
                    } else {
            // 특정 카드 앞에 삽입
                        const allCards = [...listEl.querySelectorAll('.drag-item')];
                        const targetIdx = allCards.indexOf(afterElement);
                        targetItems.splice(targetIdx, 0, movingItem);
                    }

                    boardData[colIdx].items = targetItems;
                    isDragging = false;
                    saveToServer();
                }
            };

// [도와주는 함수] 마우스 위치에서 가장 가까운 다음 카드를 찾음
            function getDragAfterElement(container, y) {
                const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];

                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2; // 카드 중앙점과의 거리 계산
        
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            }
        // 보드 영역에 드롭 처리 (카드 이동 및 보드 순서 이동)
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type === 'item') {
                const info = JSON.parse(e.dataTransfer.getData('info'));
                const moving = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false; saveToServer();
            } else if (type === 'col') {
                const fromIdx = e.dataTransfer.getData('from');
                if (fromIdx !== "" && fromIdx != colIdx) {
                    const temp = boardData.splice(fromIdx, 1)[0];
                    boardData.splice(colIdx, 0, temp);
                    isDragging = false; saveToServer();
                }
            }
        };

        // 보관함 여부에 따라 다른 리스트에 렌더링
        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });
    
    // 업무 완료함 카운트 배지 업데이트
    const countEl = document.getElementById('archive-count');
    if (countEl) countEl.textContent = archCount;
}

// 5. 전역 이벤트 리스너

// [업무 완료함 열기/닫기 토글] HTML의 id="archive-toggle-btn"과 연동
const archiveToggle = document.getElementById('archive-toggle-btn');
if (archiveToggle) {
    archiveToggle.onclick = () => {
        const section = document.getElementById('archive-section');
        section.classList.toggle('open');
    };
}

// [새 업무 보드 추가] HTML의 id="add-col-btn"과 연동
const addColBtn = document.getElementById('add-col-btn');
if (addColBtn) {
    addColBtn.onclick = () => {
        const title = prompt('새 보드 제목을 입력하세요:');
        if (title && title.trim()) {
            boardData.push({
                title: title.trim(),
                items: [],
                collapsed: false,
                archived: false,
                color: '#94a3b8'
            });
            saveToServer();
        }
    };
}



