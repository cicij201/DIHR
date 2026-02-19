import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 주신 데이터베이스 정보만 활용
const firebaseConfig = {
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false;

// 실시간 데이터 수신 및 화면 렌더링
onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    boardData = data || [];
    renderDOM();
});

function saveToServer() {
    set(boardRef, boardData);
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
                    `<div class="color-dot" style="background:${c}"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group"><button class="add-item-btn">+ 할 일 추가</button></div>
        `;

        // 보드 타이틀 및 색상 이벤트
        colNode.querySelector('.col-title').onblur = (e) => { boardData[colIdx].title = e.target.textContent; saveToServer(); };
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 보관/삭제/접기 버튼
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('이 보드를 삭제할까요?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };

        // 아이템(카드) 추가
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'});
            saveToServer();
        };

        // --- 카드 드래그 앤 드롭 로직 ---
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text">${item.text || item}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                </div>
            `;
            
            // 카드 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    if(typeof boardData[colIdx].items[itemIdx] === 'string') {
                        boardData[colIdx].items[itemIdx] = { text: boardData[colIdx].items[itemIdx], color: colors[i] };
                    } else {
                        boardData[colIdx].items[itemIdx].color = colors[i];
                    }
                    saveToServer();
                };
            });

            itemEl.ondragstart = (e) => { e.stopPropagation(); isDragging = true; e.dataTransfer.setData('itemInfo', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx})); };
            itemEl.onblur = (e) => {
                if(typeof boardData[colIdx].items[itemIdx] === 'object') boardData[colIdx].items[itemIdx].text = e.target.textContent;
                else boardData[colIdx].items[itemIdx] = e.target.textContent;
                saveToServer();
            };
            listEl.appendChild(itemEl);
        });

        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const info = e.dataTransfer.getData('itemInfo');
            if (info) {
                const {fromCol, fromIdx} = JSON.parse(info);
                const moving = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 섹션 분류: 보관함 vs 메인 보드
        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });

    document.getElementById('archive-count').textContent = archCount;
}

// 초기 버튼 설정
document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('보드 제목을 입력하세요:');
    if(t) {
        boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'});
        saveToServer();
    }
};

document.getElementById('archive-toggle-btn').onclick = () => {
    document.getElementById('archive-section').classList.toggle('open');
};
