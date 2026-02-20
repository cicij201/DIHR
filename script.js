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

// 실시간 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    if (data) {
        boardData = data.map(col => ({
            ...col,
            items: (col.items || []).map(item => 
                typeof item === 'string' ? { text: item, color: '#ffffff' } : item
            )
        }));
    } else {
        boardData = [];
    }
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

        const itemCount = column.items ? column.items.length : 0;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">
                    ${column.title} <span class="badge">${itemCount}</span>
                </h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="icon-btn archive-btn">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="display:flex; gap:4px; padding:0 10px 10px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                    `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group" style="padding:10px;"><button class="add-item-btn" style="width:100%;">+ 추가</button></div>
        `;

        // 보드 접기 이벤트 (상하)
        colNode.querySelector('.collapse-btn').onclick = () => {
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };

        // 보드 이동 드래그 로직
        colNode.ondragstart = (e) => {
            if (e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'column');
            e.dataTransfer.setData('fromIdx', colIdx);
        };
        colNode.ondragend = () => isDragging = false;
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            const type = e.dataTransfer.getData('type');
            const fromIdx = e.dataTransfer.getData('fromIdx');
            if (type === 'column' && fromIdx !== "" && fromIdx != colIdx) {
                const temp = boardData[fromIdx];
                boardData.splice(fromIdx, 1);
                boardData.splice(colIdx, 0, temp);
                isDragging = false;
                saveToServer();
            }
        };

        // 카드 렌더링
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `<div contenteditable="true" class="item-text">${item.text}</div>`;

            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('type', 'item');
                e.dataTransfer.setData('itemInfo', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx}));
            };
            itemEl.ondragend = () => isDragging = false;
            listEl.appendChild(itemEl);
        });

        // 카드 드롭 로직
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            const info = e.dataTransfer.getData('itemInfo');
            if (type === 'item' && info) {
                const {fromCol, fromIdx} = JSON.parse(info);
                const moving = boardData[fromCol].items.splice(fromIdx, 1)[0];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 기타 버튼
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제하시겠습니까?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'});
            saveToServer();
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    document.getElementById('archive-count').textContent = archCount;
}

document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('보드 제목:');
    if(t) { boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'}); saveToServer(); }
};
document.getElementById('archive-toggle-btn').onclick = () => document.getElementById('archive-section').classList.toggle('open');
