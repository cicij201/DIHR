import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// [설정] 주신 데이터베이스 정보를 유지합니다.
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
    if (isDragging) return; // 사용자가 드래그 중일 때는 화면 갱신을 멈춤
    const data = snapshot.val();
    
    if (data) {
        // 하위 호환성 유지: 단순 문자열 아이템을 객체 형태로 변환
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
}, (error) => {
    console.error("Firebase 로드 에러:", error);
});

// [저장] 서버로 데이터 전송
function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

// [렌더링] 메인 화면 그리기
function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        // 상하 접기 기능을 위해 collapsed 클래스 적용
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        const itemCount = column.items ? column.items.length : 0;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">
                    ${column.title} <span class="badge" style="background:rgba(0,0,0,0.1); color:#666; margin-left:5px;">${itemCount}</span>
                </h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
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

        // --- 보드 이벤트 ---
        // 1. 보드 제목 수정
        colNode.querySelector('.col-title').onblur = (e) => {
            const newTitle = e.target.childNodes[0].textContent.trim();
            boardData[colIdx].title = newTitle;
            saveToServer();
        };

        // 2. 보드 접기 (상하 방식)
        colNode.querySelector('.collapse-btn').onclick = () => {
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };

        // 3. 보드 보관/삭제
        colNode.querySelector('.archive-btn').onclick = () => {
            boardData[colIdx].archived = !boardData[colIdx].archived;
            saveToServer();
        };
        colNode.querySelector('.delete-btn').onclick = () => {
            if (confirm('이 보드를 영구 삭제할까요?')) {
                boardData.splice(colIdx, 1);
                saveToServer();
            }
        };

        // 4. 보드 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 5. 보드(컬럼) 드래그 이동 로직
        colNode.ondragstart = (e) => {
            if (e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'column');
            e.dataTransfer.setData('fromIdx', colIdx);
        };
        colNode.ondragend = () => { isDragging = false; };
        colNode.ondragover = (e) => { e.preventDefault(); };
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

        // --- 아이템(카드) 렌더링 ---
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

            // 카드 드래그 시작
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('type', 'item');
                e.dataTransfer.setData('itemInfo', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx}));
            };
            itemEl.ondragend = () => { isDragging = false; };

            // 카드 내용 수정
            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx].text = e.target.textContent;
                saveToServer();
            };

            // 카드 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            listEl.appendChild(itemEl);
        });

        // 카드 드롭 영역 처리
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            const info = e.dataTransfer.getData('itemInfo');
            if (type === 'item' && info) {
                const {fromCol, fromIdx} = JSON.parse(info);
                const moving = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 할 일 추가 버튼
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무 내용을 입력하세요', color: '#ffffff'});
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

// 상단 헤더: 보드 추가 버튼
document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('현황판에 추가할 업무 보드 제목:');
    if(t) {
        boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'});
        saveToServer();
    }
};

// 보관함 토글
document.getElementById('archive-toggle-btn').onclick = () => {
    document.getElementById('archive-section').classList.toggle('open');
};
