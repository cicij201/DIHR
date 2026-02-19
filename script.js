import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ★ Firebase 설정 (본인의 실제 설정값으로 교체 필수)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "dihr-9bb0b.firebaseapp.com",
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b",
    storageBucket: "dihr-9bb0b.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let draggedItem = null;
let draggedColumn = null;

// 서버에서 데이터 실시간 수신
onValue(boardRef, (snapshot) => {
    const data = snapshot.val();
    boardData = data || [{ title: '협업 보드 시작', items: ['새 할 일'], collapsed: false, archived: false, color: '#3b82f6' }];
    renderDOM();
});

function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    const archCountDisplay = document.getElementById('archive-count');
    
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

        // 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 컬럼 드래그 (보드 자체 이동)
        colNode.ondragstart = (e) => { if (e.target.classList.contains('drag-item')) return; draggedColumn = colIdx; };
        colNode.ondragover = (e) => {
            e.preventDefault();
            if (draggedColumn === null || draggedColumn === colIdx) return;
            const temp = boardData[draggedColumn];
            boardData.splice(draggedColumn, 1);
            boardData.splice(colIdx, 0, temp);
            draggedColumn = colIdx;
            saveToServer();
        };

        // 아이템 렌더링 및 드래그
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.textContent = item;
            itemEl.draggable = true;
            itemEl.contentEditable = true;
            itemEl.ondragstart = (e) => { e.stopPropagation(); draggedItem = { fromCol: colIdx, fromIdx: itemIdx }; };
            itemEl.onblur = () => { boardData[colIdx].items[itemIdx] = itemEl.textContent; saveToServer(); };
            listEl.appendChild(itemEl);
        });

        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (draggedItem) {
                const itemValue = boardData[draggedItem.fromCol].items.splice(draggedItem.fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(itemValue);
                draggedItem = null;
                saveToServer();
            }
        };

        // 버튼 이벤트
        colNode.querySelector('.col-title').onblur = (e) => { boardData[colIdx].title = e.target.textContent; saveToServer(); };
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => { if(!boardData[colIdx].items) boardData[colIdx].items = []; boardData[colIdx].items.push('새 업무'); saveToServer(); };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    archCountDisplay.textContent = archCount;
}

function saveToServer() { set(boardRef, boardData); }
document.getElementById('add-col-btn').onclick = () => { const t = prompt('업무명:'); if(t) { boardData.push({title:t, items:[], collapsed:false, archived:false}); saveToServer(); } };
document.getElementById('archive-toggle-btn').onclick = () => archiveSection.classList.toggle('open');
