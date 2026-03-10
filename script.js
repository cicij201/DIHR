import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// [설정] Firebase 연결
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
            <div class="add-btn-group">
                <button class="add-item-btn">+ 할 일 추가</button>
            </div>
        `;

        // --- 보드 이벤트 ---
        // 보드 추가 기능 (상단 버튼 이벤트는 하단에 별도 정의)
        
        // 보드 제목 수정
        colNode.querySelector('.col-title').onblur = (e) => {
            boardData[colIdx].title = e.target.textContent.trim();
            saveToServer();
        };

        // 보드 삭제
        colNode.querySelector('.delete-btn').onclick = () => {
            if (confirm('이 보드를 삭제할까요?')) {
                boardData.splice(colIdx, 1);
                saveToServer();
            }
        };

        // 보드 보관/복구
        colNode.querySelector('.archive-btn').onclick = () => {
            boardData[colIdx].archived = !boardData[colIdx].archived;
            saveToServer();
        };

        // 보드 접기
        colNode.querySelector('.collapse-btn').onclick = () => {
            boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
            saveToServer();
        };

        // --- 카드 추가 기능 (보드 내부) ---
        colNode.querySelector('.add-item-btn').onclick = () => {
            if (!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({ text: '새 업무 내용을 입력하세요', color: '#ffffff' });
            saveToServer();
        };

        // --- 카드 렌더링 및 드래그 앤 드롭 ---
        const listEl = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text">${item.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                </div>
            `;

            // 카드 수정 및 색상 변경 로직... (이전과 동일)
            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx].text = e.target.textContent;
                saveToServer();
            };

            listEl.appendChild(itemEl);
        });

        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });
    document.getElementById('archive-count').textContent = archCount;
}

// --- 보관함 열기/닫기 토글 기능 보완 ---
const archiveHeader = document.getElementById('archive-header');
if (archiveHeader) {
    archiveHeader.onclick = () => {
        const section = document.getElementById('archive-section');
        section.classList.toggle('open');
    };
}

// --- 새 업무 보드 추가 기능 (상단 버튼) ---
const addColBtn = document.getElementById('add-col-btn');
if (addColBtn) {
    addColBtn.onclick = () => {
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
}
// --- [3단계 핵심] 이력 추가 함수 ---
function addHistory(item, message) {
    if (!item.history) item.history = [];
    item.history.push({
        date: new Date().toLocaleString(),
        msg: message
    });
}

// --- renderDOM 내부 카드 클릭 이벤트 ---
itemEl.onclick = (e) => {
    // 버튼이나 텍스트 편집 클릭 시엔 모달 안 띄움
    if (e.target.classList.contains('item-del-btn') || e.target.classList.contains('item-text')) return;
    
    openModal(colIdx, itemIdx);
};

// --- 모달 열기 및 저장 로직 ---
let currentTarget = null; // 현재 수정 중인 카드 정보 저장

function openModal(cIdx, iIdx) {
    const item = boardData[cIdx].items[iIdx];
    currentTarget = { cIdx, iIdx };
    
    document.getElementById('modal-title').value = item.text;
    document.getElementById('modal-desc').value = item.desc || '';
    
    // 이력 화면에 그리기
    const histList = document.getElementById('history-list');
    histList.innerHTML = (item.history || []).map(h => 
        `<li><strong>[${h.date}]</strong> ${h.msg}</li>`
    ).join('');
    
    document.getElementById('item-modal').style.display = 'flex';
}

// 모달 저장 버튼
document.getElementById('modal-save-btn').onclick = () => {
    const { cIdx, iIdx } = currentTarget;
    const item = boardData[cIdx].items[iIdx];
    
    item.text = document.getElementById('modal-title').value;
    item.desc = document.getElementById('modal-desc').value;
    
    addHistory(item, "상세 정보 수정됨");
    saveToServer();
    document.getElementById('item-modal').style.display = 'none';
};

// --- [핵심] 카드 드롭 시 이력 기록 ---
// listEl.ondrop 내부 로직 수정
if (type === 'item') {
    const info = JSON.parse(e.dataTransfer.getData('info'));
    const movingItem = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
    
    // 이력 추가: 어느 보드로 옮겨졌는지 기록
    const targetColName = boardData[colIdx].title;
    addHistory(movingItem, `'${targetColName}' 보드로 이동됨`);
    
    // (기존 삽입 로직 동일...)
}
