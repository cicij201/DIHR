import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", 
    projectId: "dihr-9bb0b" 
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false;

// [수신] 서버 데이터 실시간 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    boardData = Array.isArray(data) ? data.map(col => ({
        ...col,
        items: Array.isArray(col.items) ? col.items.map(item => 
            typeof item === 'string' ? { text: item, color: '#ffffff' } : item
        ) : []
    })) : [];
    renderDOM();
});

function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        // [보드 토글] collapsed 상태 반영
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
            <ul class="item-list" style="min-height:20px; list-style:none; padding:0;"></ul>
            <div class="add-btn-group" style="padding:10px;">
                <button class="add-item-btn" style="width:100%; cursor:pointer;">+ 할 일 추가</button>
            </div>
        `;

        // --- 보드 관련 이벤트 ---
        // 1. 보드 제목 수정
        colNode.querySelector('.col-title').onblur = (e) => {
            boardData[colIdx].title = e.target.textContent.trim();
            saveToServer();
        };
        // 2. 보드 접기/펴기 (토글)
        colNode.querySelector('.collapse-btn').onclick = () => {
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };
        // 3. 보드 보관/복구
        colNode.querySelector('.archive-btn').onclick = () => {
            boardData[colIdx].archived = !boardData[colIdx].archived;
            saveToServer();
        };
        // 4. 보드 삭제
        colNode.querySelector('.delete-btn').onclick = () => {
            if (confirm('보드를 영구 삭제하시겠습니까?')) {
                boardData.splice(colIdx, 1);
                saveToServer();
            }
        };
        // 5. 보드 상단 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
            dot.onclick = () => {
                boardData[colIdx].color = colors[i];
                saveToServer();
            };
        });

        // --- 카드 관련 이벤트 ---
        // 6. 새 카드 추가 (누락되었던 기능)
        colNode.querySelector('.add-item-btn').onclick = () => {
            if (!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({ text: '새 업무 내용을 입력하세요', color: '#ffffff' });
            saveToServer();
        };

        const listEl = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            // [카드 색상] 적용
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none;">${item.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                    <button class="item-del-btn" style="border:none; color:red; cursor:pointer; background:none;">×</button>
                </div>
            `;

            // 7. 카드 텍스트 수정
            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx].text = e.target.textContent;
                saveToServer();
            };
            // 8. 카드별 색상 변경 (누락되었던 기능)
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#d1fae5','#dbeafe','#ffffff'];
                dot.onclick = () => {
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });
            // 9. 개별 카드 삭제
            itemEl.querySelector('.item-del-btn').onclick = () => {
                boardData[colIdx].items.splice(itemIdx, 1);
                saveToServer();
            };

            // 카드 드래그 앤 드롭 로직
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('type', 'item');
                e.dataTransfer.setData('info', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => isDragging = false;

            listEl.appendChild(itemEl);
        });

        // 보드 간 카드 드롭
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            if (type === 'item') {
                const info = JSON.parse(e.dataTransfer.getData('info'));
                const moving = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false; 
                saveToServer();
            }
        };

        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });
    document.getElementById('archive-count').textContent = archCount;
}

// 10. 보관함 토글 (서랍 열기/닫기)
document.getElementById('archive-header').onclick = () => {
    document.getElementById('archive-section').classList.toggle('open');
};

// 11. 전역 새 보드 추가
document.getElementById('add-col-btn').onclick = () => {
    const title = prompt('추가할 보드의 제목을 입력하세요:');
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
