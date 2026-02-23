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

// 2. 서버 데이터 수신
onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    boardData = Array.isArray(data) ? data.map(col => ({
        ...col,
        items: Array.isArray(col.items) ? col.items.map(item => 
            typeof item === 'string' ? { text: item, color: '#ffffff' } : { ...item }
        ) : []
    })) : [];
    renderDOM();
});

function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

// 3. 메인 렌더링 함수
function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

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

        // --- 보드 이벤트 ---
        const titleNode = colNode.querySelector('.col-title');
        titleNode.oninput = (e) => { boardData[colIdx].title = e.target.textContent; };
        titleNode.onblur = () => saveToServer();

        colNode.querySelector('.collapse-btn').onclick = (e) => {
            e.stopPropagation();
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };

        // [복구 버튼 수정] stopPropagation 추가
        colNode.querySelector('.archive-btn').onclick = (e) => {
            e.stopPropagation();
            boardData[colIdx].archived = !boardData[colIdx].archived;
            if (!boardData[colIdx].archived) boardData[colIdx].collapsed = false;
            saveToServer();
        };

        colNode.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            if(confirm('보드를 삭제할까요?')) { boardData.splice(colIdx, 1); saveToServer(); }
        };

        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // --- 보드 드래그 ---
        colNode.ondragstart = (e) => {
            if(e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'col');
            e.dataTransfer.setData('from', colIdx);
        };

        // --- 카드 추가 ---
        colNode.querySelector('.add-item-btn').onclick = () => {
            if (!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({ text: '새 업무를 입력하세요', color: '#ffffff' });
            saveToServer();
        };

        // --- 카드 리스트 및 드롭 (중간 삽입 로직) ---
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

            const textNode = itemEl.querySelector('.item-text');
            textNode.oninput = (e) => { boardData[colIdx].items[itemIdx].text = e.target.textContent; };
            textNode.onblur = () => saveToServer();

            itemEl.querySelector('.item-del-btn').onclick = (e) => {
                e.stopPropagation();
                boardData[colIdx].items.splice(itemIdx, 1);
                saveToServer();
            };

            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                itemEl.classList.add('dragging'); // 드래그 중인 표시
                e.dataTransfer.setData('type', 'item');
                e.dataTransfer.setData('info', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => {
                isDragging = false;
                itemEl.classList.remove('dragging');
            };

            listEl.appendChild(itemEl);
        });

        // [핵심] 카드 리스트 드롭 로직
        listEl.ondragover = (e) => { e.preventDefault(); };
        listEl.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            
            if (type === 'item') {
                const info = JSON.parse(e.dataTransfer.getData('info'));
                const movingItem = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
                
                // 마우스 위치에 따른 삽입 위치 계산
                const afterElement = getDragAfterElement(listEl, e.clientY);
                const targetItems = boardData[colIdx].items || [];
                
                if (afterElement == null) {
                    targetItems.push(movingItem);
                } else {
                    const allCards = [...listEl.querySelectorAll('.drag-item')];
                    const targetIdx = allCards.indexOf(afterElement);
                    targetItems.splice(targetIdx, 0, movingItem);
                }
                
                boardData[colIdx].items = targetItems;
                isDragging = false;
                saveToServer();
            }
        };

        // 보드 순서 변경 드롭
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type === 'col') {
                const fromIdx = e.dataTransfer.getData('from');
                if (fromIdx !== "" && fromIdx != colIdx) {
                    const temp = boardData.splice(fromIdx, 1)[0];
                    boardData.splice(colIdx, 0, temp);
                    isDragging = false;
                    saveToServer();
                }
            }
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    
    document.getElementById('archive-count').textContent = archCount;
}

// 4. [도움 함수] 카드 위치 계산 (전역 범위로 이동)
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 5. 전역 UI 이벤트
document.getElementById('archive-toggle-btn').onclick = () => {
    document.getElementById('archive-section').classList.toggle('open');
};

document.getElementById('add-col-btn').onclick = () => {
    const title = prompt('새 보드 제목:');
    if (title && title.trim()) {
        boardData.push({ title: title.trim(), items: [], collapsed: false, archived: false, color: '#94a3b8' });
        saveToServer();
    }
};
