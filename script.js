import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "여기에_본인의_API_KEY_입력",
    authDomain: "dihr-9bb0b.firebaseapp.com",
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b",
    storageBucket: "dihr-9bb0b.appspot.com",
    messagingSenderId: "여기에_본인의_SENDER_ID_입력",
    appId: "여기에_본인의_APP_ID_입력"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false; // 드래그 중에는 화면 갱신을 잠시 멈춰 렉을 방지

onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 드래그 도중 서버 데이터가 와서 화면이 리셋되는 현상 방지
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
    if (!mainList) return;

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
                    <button class="icon-btn archive-btn">📦</button>
                    <button class="icon-btn delete-btn">×</button>
                </div>
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group"><button class="add-item-btn">+ 추가</button></div>
        `;

        // 보드 드래그 시작
        colNode.ondragstart = (e) => {
            if (e.target.classList.contains('drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('colIdx', colIdx);
        };

        colNode.ondragend = () => { isDragging = false; };

        // 보드 이동(드롭)
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            const fromColIdx = e.dataTransfer.getData('colIdx');
            if (fromColIdx !== "" && fromColIdx != colIdx) {
                const temp = boardData[fromColIdx];
                boardData.splice(fromColIdx, 1);
                boardData.splice(colIdx, 0, temp);
                saveToServer();
            }
        };

        // 아이템 리스트 구성
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.textContent = item;
            itemEl.draggable = true;
            itemEl.contentEditable = true;
            
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({colIdx, itemIdx}));
            };

            itemEl.onblur = () => {
                boardData[colIdx].items[itemIdx] = itemEl.textContent;
                saveToServer();
            };

            listEl.appendChild(itemEl);
        });

        // 아이템 드롭 영역
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.stopPropagation();
            const data = e.dataTransfer.getData('itemInfo');
            if (data) {
                const {fromCol, fromIdx} = JSON.parse(data);
                const movingItem = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(movingItem);
                isDragging = false;
                saveToServer();
            }
        };

        // 버튼 클릭 이벤트
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => { 
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push('새 할 일');
            saveToServer();
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    
    document.getElementById('archive-count').textContent = archCount;
}

// 상단 버튼 및 보관함 토글
window.onload = () => {
    document.getElementById('add-col-btn').onclick = () => {
        const t = prompt('제목:');
        if(t) { boardData.push({title:t, items:[], collapsed:false, archived:false, color:'#3b82f6'}); saveToServer(); }
    };
    document.getElementById('archive-toggle-btn').onclick = () => {
        document.getElementById('archive-section').classList.toggle('open');
    };
};
