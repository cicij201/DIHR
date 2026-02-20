import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// [1] Firebase 설정
const firebaseConfig = {
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false;

// [2] 데이터 수신 및 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 드래그 중에는 화면 갱신 방지
    const data = snapshot.val();
    
    if (data) {
        // 하위 호환성 체크: 아이템이 객체가 아닌 경우 객체로 변환
        boardData = data.map(col => ({
            ...col,
            collapsed: col.collapsed || false,
            archived: col.archived || false,
            items: (col.items || []).map(item => 
                typeof item === 'string' ? { text: item, color: '#ffffff' } : item
            )
        }));
    } else {
        boardData = [];
    }
    renderDOM();
});

// [3] 데이터 저장
function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

// [4] 화면 렌더링 함수
function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        // 상하 접기 상태 반영
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        const itemCount = column.items ? column.items.length : 0;

        colNode.innerHTML = `
            <div class="header">
                <h1 class="col-title">
                    <span contenteditable="true" class="title-text">${column.title}</span>
                    <span class="badge">${itemCount}</span>
                </h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn" title="접기/펴기">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="icon-btn archive-btn" title="보관함 이동">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn delete-btn" title="삭제">×</button>
                </div>
            </div>
            <div class="color-picker" style="display:flex; gap:4px; padding:5px 12px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                    `<div class="color-dot" style="background:${c}; width:10px; height:10px; border-radius:50%; cursor:pointer;"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group" style="padding:10px;">
                <button class="add-item-btn" style="width:100%; border:1px dashed #cbd5e1; background:white; padding:5px; border-radius:4px; cursor:pointer;">+ 업무 추가</button>
            </div>
        `;

        // --- 이벤트 연결 ---

        // 1. 제목 수정
        const titleText = colNode.querySelector('.title-text');
        titleText.onblur = () => {
            boardData[colIdx].title = titleText.textContent;
            saveToServer();
        };

        // 2. 상하 접기/펴기 (버튼 이벤트 전파 차단)
        colNode.querySelector('.collapse-btn').onclick = (e) => {
            e.stopPropagation();
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };

        // 3. 보관/삭제
        colNode.querySelector('.archive-btn').onclick = () => {
            boardData[colIdx].archived = !boardData[colIdx].archived;
            saveToServer();
        };
        colNode.querySelector('.delete-btn').onclick = () => {
            if (confirm('이 보드를 삭제하시겠습니까?')) {
                boardData.splice(colIdx, 1);
                saveToServer();
            }
        };

        // 4. 보드 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 5. 보드(컬럼) 드래그앤드롭
        colNode.ondragstart = (e) => {
            if (e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'column');
            e.dataTransfer.setData('fromIdx', colIdx);
        };
        colNode.ondragend = () => { isDragging = false; };
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

        // 6. 카드(아이템) 렌더링
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
                e.dataTransfer.setData('info', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx}));
            };
            itemEl.ondragend = () => { isDragging = false; };

            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx].text = e.target.textContent;
                saveToServer();
            };

            listEl.appendChild(itemEl);
        });

        // 7. 카드 드롭 로직
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            const info = e.dataTransfer.getData('info');
            if (type === 'item' && info) {
                const {fromCol, fromIdx} = JSON.parse(info);
                const moving = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 8. 할 일 추가
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'});
            saveToServer();
        };

        // 섹션 분류 배치
        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });

    document.getElementById('archive-count').textContent = archCount;
}

// [5] 초기 컨트롤 설정
document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('추가할 보드 제목을 입력하세요:');
    if(t) {
        boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'});
        saveToServer();
    }
};

document.getElementById('archive-toggle-btn').onclick = (e) => {
    e.preventDefault();
    document.getElementById('archive-section').classList.toggle('open');
};
