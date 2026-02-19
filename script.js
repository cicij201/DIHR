import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. Firebase 콘솔에서 복사한 본인의 설정값을 여기에 넣으세요
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
let isDragging = false; // 드래그 중 서버 데이터 업데이트 방지

// 2. 서버 데이터 실시간 수신
onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 드래그 중엔 화면 리셋 금지
    const data = snapshot.val();
    
    // 데이터 구조 자동 보정 (텍스트 -> 객체)
    if (data) {
        boardData = data.map(col => ({
            ...col,
            items: (col.items || []).map(item => 
                typeof item === 'string' ? { text: item, color: '#ffffff' } : item
            )
        }));
    } else {
        boardData = []; // 데이터가 없으면 빈 배열
    }
    renderDOM();
}, (error) => {
    console.error("데이터 로드 실패:", error);
});

// 3. 서버 저장 함수
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
            <div class="color-picker">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                    `<div class="color-dot" style="background:${c}"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group"><button class="add-item-btn">+ 추가</button></div>
        `;

        // 보드 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 보드 드래그 (이동)
        colNode.ondragstart = (e) => {
            if (e.target.classList.contains('drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('colIdx', colIdx);
        };
        colNode.ondragend = () => { isDragging = false; };
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

        // 아이템(카드) 렌더링
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text">${item.text}</div>
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
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            // 카드 드래그 시작
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx}));
            };

            // 카드 내용 수정
            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx].text = e.target.textContent;
                saveToServer();
            };

            listEl.appendChild(itemEl);
        });

        // 카드 드롭 영역
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
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

        // 버튼 이벤트들
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제하시겠습니까?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => { 
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 할 일', color: '#ffffff'});
            saveToServer();
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    document.getElementById('archive-count').textContent = archCount;
}

// 상단 버튼 및 초기화
document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('업무 보드 제목:');
    if(t) { boardData.push({title:t, items:[], collapsed:false, archived:false, color:'#3b82f6'}); saveToServer(); }
};
document.getElementById('archive-toggle-btn').onclick = () => {
    document.getElementById('archive-section').classList.toggle('open');
};
