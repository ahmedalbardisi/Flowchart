/* عناصر واجهة المستخدم */
const canvasContent = document.getElementById("canvasContent");
const nodesContainer = document.getElementById("nodesContainer");
const connectionsSvg = document.getElementById("connections");
const sidebarTools = document.querySelectorAll(".tool");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const projectNameInput = document.getElementById("projectName");
const backgroundStyleSelect = document.getElementById("backgroundStyleSelect");
const fontStyleSelect = document.getElementById("fontStyleSelect");

/* المتغيرات الرئيسية */
let nodes = [];
let connections = [];
let isConnecting = false;
let sourcePortData = null;
let scale = 1;
const scaleStep = 0.1;
const minScale = 0.5;
const maxScale = 3;
let currentDraggingNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let historyStates = [];
let historyIndex = -1;
let nodeCounter = 0; // لضمان تفرد معرّفات العقد

/* دالة تغيير نمط الخلفية */
function changeBackgroundStyle(style) {
  canvasContent.classList.remove("bg-grid", "bg-dots", "bg-lines", "bg-none");
  canvasContent.classList.add(`bg-${style}`);
  localStorage.setItem("flowchart-bg-style", style);
}

/* دالة تغيير نمط الخط (السماكة والحجم) */
function changeFontStyle(boldness, size) {
  document.querySelectorAll(".node .node-label").forEach((label) => {
    label.classList.remove("font-bold", "font-normal", "font-small", "font-medium", "font-large");
    label.classList.add(`font-${boldness}`, `font-${size}`);
  });
  localStorage.setItem("flowchart-font-boldness", boldness);
  localStorage.setItem("flowchart-font-size", size);
}

/* تحديث حجم الخلفية بناءً على مواقع العقد */
function updateCanvasSize() {
  const minWidth = 1200;
  const minHeight = 1200;
  const margin = 100;
  if (nodes.length === 0) {
    canvasContent.style.width = minWidth + "px";
    canvasContent.style.height = minHeight + "px";
    return;
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  nodes.forEach((node) => {
    const nodeWidth = node.el.offsetWidth;
    const nodeHeight = node.el.offsetHeight;
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + nodeWidth);
    maxY = Math.max(maxY, node.y + nodeHeight);
  });
  const offsetX = minX < 0 ? Math.abs(minX) + margin / 2 : 0;
  const offsetY = minY < 0 ? Math.abs(minY) + margin / 2 : 0;
  const newWidth = Math.max(maxX + offsetX + margin / 2, minWidth);
  const newHeight = Math.max(maxY + offsetY + margin / 2, minHeight);
  canvasContent.style.width = newWidth + "px";
  canvasContent.style.height = newHeight + "px";
}

/* إدارة سجل التاريخ (Undo/Redo) */
function pushState() {
  const state = {
    nodes: nodes.map((n) => ({
      id: n.id,
      shape: n.shape,
      x: n.x,
      y: n.y,
      content: n.content || "",
    })),
    connections: JSON.parse(JSON.stringify(connections)),
  };
  if (
    historyStates.length > 0 &&
    JSON.stringify(historyStates[historyStates.length - 1]) === JSON.stringify(state)
  ) {
    return;
  }
  historyStates = historyStates.slice(0, historyIndex + 1);
  historyStates.push(state);
  historyIndex++;
}

function restoreState(state) {
  nodes = [];
  connections = [];
  nodesContainer.innerHTML = "";
  connectionsSvg.innerHTML = "";
  state.nodes.forEach((s) => {
    createNode(s.shape, s.x, s.y, s.id, s.content, false);
  });
  connections = [...state.connections];
  drawConnections();
  updateCanvasSize();
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(historyStates[historyIndex]);
  }
}

function redo() {
  if (historyIndex < historyStates.length - 1) {
    historyIndex++;
    restoreState(historyStates[historyIndex]);
  }
}

/* دوال التكبير والتصغير مع حدود */
function zoomIn() {
  if (scale < maxScale) {
    scale += scaleStep;
    canvasContent.style.transform = `scale(${scale})`;
  }
}

function zoomOut() {
  if (scale > minScale) {
    scale -= scaleStep;
    canvasContent.style.transform = `scale(${scale})`;
  }
}

/* تصدير المشروع كصورة باستخدام html2canvas */
function exportProject() {
  import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js")
    .then(() => {
      html2canvas(canvasContent, { scale: 2 }).then((canvas) => {
        const link = document.createElement("a");
        const projectName = projectNameInput.textContent.trim() || "untitled";
        link.download = projectName + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    })
    .catch((error) => {
      alert("فشل تحميل مكتبة html2canvas.");
      console.error(error);
    });
}

/* مسح المشروع */
function clearProject() {
  nodes = [];
  connections = [];
  nodesContainer.innerHTML = "";
  connectionsSvg.innerHTML = "";
  pushState();
  updateCanvasSize();
}

/* إعداد الأزرار */
undoBtn?.addEventListener("click", undo);
redoBtn?.addEventListener("click", redo);
zoomInBtn?.addEventListener("click", zoomIn);
zoomOutBtn?.addEventListener("click", zoomOut);
exportBtn?.addEventListener("click", exportProject);
clearBtn?.addEventListener("click", clearProject);

/* إعداد سحب الأدوات من الشريط الجانبي */
sidebarTools.forEach((tool) => {
  tool.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("shape", tool.dataset.shape);
  });
});

/* السماح بالإفلات داخل اللوحة */
canvasContent.addEventListener("dragover", (e) => {
  e.preventDefault();
});
canvasContent.addEventListener("drop", (e) => {
  e.preventDefault();
  const shape = e.dataTransfer.getData("shape");
  const rect = canvasContent.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;
  createNode(shape, x, y, null, "", true);
});

/* دالة تحديد موقع المنفذ */
function getPortPositionFromPort(port) {
  if (port.classList.contains("top")) return "top";
  if (port.classList.contains("bottom")) return "bottom";
  if (port.classList.contains("left")) return "left";
  if (port.classList.contains("right")) return "right";
  if (port.classList.contains("bottom-left")) return "bottom-left";
  if (port.classList.contains("bottom-right")) return "bottom-right";
  return "top";
}

/* إنشاء نقطة اتصال */
function createPort(portType, position) {
  const port = document.createElement("div");
  port.classList.add("port", position);
  port.dataset.portType = portType;
  port.addEventListener("click", (e) => {
    updateCanvasSize();
    const currentPortPos = getPortPositionFromPort(port);
    const currentNodeId = port.parentElement.dataset.id;
    if (!isConnecting) {
      isConnecting = true;
      sourcePortData = { nodeId: currentNodeId, position: currentPortPos };
      port.classList.add("selected-port");
    } else if (sourcePortData) {
      if (sourcePortData.nodeId === currentNodeId && sourcePortData.position === currentPortPos) {
        resetConnectionProcess();
        return;
      }
      createConnection(sourcePortData, { nodeId: currentNodeId, position: currentPortPos });
      resetConnectionProcess();
      pushState();
    }
    e.stopPropagation();
  });
  return port;
}

function resetConnectionProcess() {
  isConnecting = false;
  document.querySelectorAll(".port.selected-port").forEach((p) => p.classList.remove("selected-port"));
  sourcePortData = null;
  if (tempConnectionLine) {
    tempConnectionLine.remove();
    tempConnectionLine = null;
  }
}

let tempConnectionLine = null;

/* إنشاء عقدة جديدة */
function createNode(shape, x, y, customId = null, content = "", pushHistory = true) {
  const shapeMapping = {
    decision: "diamond",
    "input-output": "parallelogram",
    connector: "circle",
  };
  const actualShape = shape;
  const cssShape = shapeMapping[shape] || shape;
  const nodeId = customId || `node-${++nodeCounter}`;
  const nodeEl = document.createElement("div");
  nodeEl.classList.add("node", cssShape);
  nodeEl.dataset.id = nodeId;

  const label = document.createElement("div");
  label.classList.add("node-label");
  const boldness = localStorage.getItem("flowchart-font-boldness") || "normal";
  const size = localStorage.getItem("flowchart-font-size") || "medium";
  label.classList.add(`font-${boldness}`, `font-${size}`);
  label.contentEditable = true;
  label.textContent = content || actualShape;
  nodeEl.appendChild(label);

  // إضافة نقاط الاتصال حسب نوع العقدة
  switch (actualShape) {
    case "annotation":
      break;
    case "start":
      nodeEl.appendChild(createPort("out", "bottom"));
      break;
    case "end":
      nodeEl.appendChild(createPort("in", "top"));
      break;
    case "decision":
      nodeEl.appendChild(createPort("in", "top"));
      nodeEl.appendChild(createPort("out", "bottom-left"));
      nodeEl.appendChild(createPort("out", "bottom-right"));
      break;
    case "loop":
      nodeEl.appendChild(createPort("in", "top"));
      nodeEl.appendChild(createPort("out", "bottom"));
      break;
    case "process":
    case "input-output":
    case "connector":
      nodeEl.appendChild(createPort("in", "top"));
      nodeEl.appendChild(createPort("out", "bottom"));
      nodeEl.appendChild(createPort("out", "left"));
      nodeEl.appendChild(createPort("out", "right"));
      break;
    default:
      nodeEl.appendChild(createPort("in", "top"));
      nodeEl.appendChild(createPort("out", "bottom"));
      nodeEl.appendChild(createPort("out", "left"));
      nodeEl.appendChild(createPort("out", "right"));
      break;
  }

  // زر حذف العقدة
  const delBtn = document.createElement("button");
  delBtn.classList.add("delete-btn");
  delBtn.textContent = "×";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteNode(nodeId);
    pushState();
    updateCanvasSize();
  });
  nodeEl.appendChild(delBtn);

  nodeEl.style.left = x + "px";
  nodeEl.style.top = y + "px";
  nodesContainer.appendChild(nodeEl);

  const nodeData = { id: nodeId, shape: actualShape, x, y, el: nodeEl, content: label.textContent };
  nodes.push(nodeData);

  // تفعيل سحب العقدة
  nodeEl.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("port") || e.target.classList.contains("delete-btn")) return;
    currentDraggingNode = nodeData;
    const rect = nodeEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });
  nodeEl.addEventListener("touchstart", (e) => {
    if (e.target.classList.contains("port") || e.target.classList.contains("delete-btn") || e.target.classList.contains("node-label"))
      return;
    currentDraggingNode = nodeData;
    const touch = e.touches[0];
    const rect = nodeEl.getBoundingClientRect();
    dragOffsetX = touch.clientX - rect.left;
    dragOffsetY = touch.clientY - rect.top;
    e.preventDefault();
  }, { passive: false });

  label.addEventListener("input", () => {
    nodeData.content = label.textContent;
    pushState();
  });

  if (pushHistory) {
    pushState();
  }
  updateCanvasSize();
}

/* حذف عقدة */
function deleteNode(nodeId) {
  nodes = nodes.filter((n) => n.id !== nodeId);
  connections = connections.filter(
    (conn) => conn.source.nodeId !== nodeId && conn.target.nodeId !== nodeId
  );
  const el = document.querySelector(`.node[data-id="${nodeId}"]`);
  if (el) el.remove();
  drawConnections();
  updateCanvasSize();
}

/* إنشاء وصلة بين نقطتي اتصال */
function createConnection(sourcePort, targetPort) {
  if (
    connections.find(
      (conn) =>
        conn.source.nodeId === sourcePort.nodeId &&
        conn.source.position === sourcePort.position &&
        conn.target.nodeId === targetPort.nodeId &&
        conn.target.position === targetPort.position
    )
  )
    return;
  connections.push({ source: sourcePort, target: targetPort });
  drawConnections();
}

/* حذف وصلة */
function deleteConnection(conn) {
  connections = connections.filter((c) => c !== conn);
  drawConnections();
}

/* الحصول على إحداثيات نقطة الاتصال */
function getPortCoordinates(nodeId, position) {
  const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
  if (!nodeEl) return { x: 0, y: 0 };
  const portEl = nodeEl.querySelector(`.port.${position}`);
  const canvasRect = canvasContent.getBoundingClientRect();
  if (portEl) {
    const portRect = portEl.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - canvasRect.left) / scale,
      y: (portRect.top + portRect.height / 2 - canvasRect.top) / scale,
    };
  } else {
    const nodeRect = nodeEl.getBoundingClientRect();
    return {
      x: (nodeRect.left + nodeRect.width / 2 - canvasRect.left) / scale,
      y: (nodeRect.top + nodeRect.height / 2 - canvasRect.top) / scale,
    };
  }
}

/* رسم الوصلات باستخدام SVG */
function drawConnections() {
  let defs = connectionsSvg.querySelector("defs");
  connectionsSvg.innerHTML = "";
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#2c3e50"></path>
      </marker>
    `;
  }
  connectionsSvg.appendChild(defs);
  connections.forEach((conn) => {
    const sourceCoords = getPortCoordinates(conn.source.nodeId, conn.source.position);
    const targetCoords = getPortCoordinates(conn.target.nodeId, conn.target.position);
    const pathD = generatePathD(sourceCoords.x, sourceCoords.y, targetCoords.x, targetCoords.y);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("class", "connection-line");
    path.setAttribute("marker-end", "url(#arrow)");
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.appendChild(path);
    connectionsSvg.appendChild(group);
  });
}

/* توليد مسار SVG ذكي */
function generatePathD(x1, y1, x2, y2, options = {}) {
  const { mode = "smart", curvature = 0.3, offset = 20, zigzagAmplitude = 10, zigzagFrequency = 2 } = options;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (mode === "angled") {
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      const midX = x1 + dx / 2;
      return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      const midY = y1 + dy / 2;
      return `M ${x1},${y1} L ${x1},${midY} L ${x2},${midY} L ${x2},${y2}`;
    } else {
      const midX = x1 + dx / 2,
        midY = y1 + dy / 2;
      return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    }
  } else if (mode === "smooth") {
    const theta = Math.atan2(dy, dx);
    const cp1x = x1 + dx * curvature;
    const cp1y = y1 + dy * curvature;
    const cp2x = x2 - dx * curvature;
    const cp2y = y2 - dy * curvature;
    const perpAngle = theta - Math.PI / 2;
    const cp1xAdj = cp1x + Math.cos(perpAngle) * offset;
    const cp1yAdj = cp1y + Math.sin(perpAngle) * offset;
    const cp2xAdj = cp2x + Math.cos(perpAngle) * offset;
    const cp2yAdj = cp2y + Math.sin(perpAngle) * offset;
    return `M ${x1},${y1} C ${cp1xAdj},${cp1yAdj} ${cp2xAdj},${cp2yAdj} ${x2},${y2}`;
  } else if (mode === "zigzag") {
    const segments = zigzagFrequency * 2 + 1;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      if (i % 2 === 1) {
        const theta = Math.atan2(dy, dx);
        const perpAngle = theta - Math.PI / 2;
        const direction = i % 4 === 1 ? 1 : -1;
        const xOffset = Math.cos(perpAngle) * zigzagAmplitude * direction;
        const yOffset = Math.sin(perpAngle) * zigzagAmplitude * direction;
        points.push({ x: x + xOffset, y: y + yOffset });
      } else {
        points.push({ x, y });
      }
    }
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x},${points[i].y}`;
    }
    return path;
  } else if (mode === "smart") {
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      const midX = x1 + dx / 2;
      return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      const midY = y1 + dy / 2;
      return `M ${x1},${y1} L ${x1},${midY} L ${x2},${midY} L ${x2},${y2}`;
    } else {
      const theta = Math.atan2(dy, dx);
      const cp1x = x1 + dx * curvature;
      const cp1y = y1 + dy * curvature;
      const cp2x = x2 - dx * curvature;
      const cp2y = y2 - dy * curvature;
      const perpAngle = theta - Math.PI / 2;
      const cp1xAdj = cp1x + Math.cos(perpAngle) * offset;
      const cp1yAdj = cp1y + Math.sin(perpAngle) * offset;
      const cp2xAdj = cp2x + Math.cos(perpAngle) * offset;
      const cp2yAdj = cp2y + Math.sin(perpAngle) * offset;
      return `M ${x1},${y1} C ${cp1xAdj},${cp1yAdj} ${cp2xAdj},${cp2yAdj} ${x2},${y2}`;
    }
  } else {
    const theta = Math.atan2(dy, dx);
    const cp1x = x1 + dx * curvature;
    const cp1y = y1 + dy * curvature;
    const cp2x = x2 - dx * curvature;
    const cp2y = y2 - dy * curvature;
    const perpAngle = theta - Math.PI / 2;
    const cp1xAdj = cp1x + Math.cos(perpAngle) * offset;
    const cp1yAdj = cp1y + Math.sin(perpAngle) * offset;
    const cp2xAdj = cp2x + Math.cos(perpAngle) * offset;
    const cp2yAdj = cp2y + Math.sin(perpAngle) * offset;
    return `M ${x1},${y1} C ${cp1xAdj},${cp1yAdj} ${cp2xAdj},${cp2yAdj} ${x2},${y2}`;
  }
}

/* أحداث السحب باستخدام الماوس */
document.addEventListener("mousemove", (e) => {
  if (currentDraggingNode) {
    const canvasRect = canvasContent.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left - dragOffsetX) / scale;
    const newY = (e.clientY - canvasRect.top - dragOffsetY) / scale;
    currentDraggingNode.x = newX;
    currentDraggingNode.y = newY;
    currentDraggingNode.el.style.left = newX + "px";
    currentDraggingNode.el.style.top = newY + "px";
    drawConnections();
  }
  if (isConnecting && sourcePortData) {
    const canvasRect = canvasContent.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / scale;
    const mouseY = (e.clientY - canvasRect.top) / scale;
    const sourceCoords = getPortCoordinates(sourcePortData.nodeId, sourcePortData.position);
    const pathD = generatePathD(sourceCoords.x, sourceCoords.y, mouseX, mouseY);
    if (!tempConnectionLine) {
      tempConnectionLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tempConnectionLine.setAttribute("class", "connection-line pending");
      tempConnectionLine.setAttribute("marker-end", "url(#arrow)");
      connectionsSvg.appendChild(tempConnectionLine);
    }
    tempConnectionLine.setAttribute("d", pathD);
  }
});

document.addEventListener("mouseup", () => {
  if (currentDraggingNode) {
    currentDraggingNode = null;
    pushState();
    updateCanvasSize();
  }
});

document.addEventListener("touchmove", (e) => {
  if (currentDraggingNode) {
    const touch = e.touches[0];
    const canvasRect = canvasContent.getBoundingClientRect();
    const newX = (touch.clientX - canvasRect.left - dragOffsetX) / scale;
    const newY = (touch.clientY - canvasRect.top - dragOffsetY) / scale;
    currentDraggingNode.x = newX;
    currentDraggingNode.y = newY;
    currentDraggingNode.el.style.left = newX + "px";
    currentDraggingNode.el.style.top = newY + "px";
    drawConnections();
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener("touchend", () => {
  if (currentDraggingNode) {
    currentDraggingNode = null;
    pushState();
    updateCanvasSize();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isConnecting) {
    resetConnectionProcess();
  }
});

/* تهيئة التطبيق (دمج جميع أحداث DOMContentLoaded) */
document.addEventListener("DOMContentLoaded", () => {
  // تهيئة سجل الحالة
  pushState();

  // إعداد تغيير الخلفية ونمط الخط
  backgroundStyleSelect.addEventListener("change", () => {
    changeBackgroundStyle(backgroundStyleSelect.value);
  });
  fontStyleSelect.addEventListener("change", () => {
    // هنا نفترض أن حجم الخط ثابت؛ ويمكنك إضافة خيار منفصل إذا رغبت
    const size = localStorage.getItem("flowchart-font-size") || "medium";
    changeFontStyle(fontStyleSelect.value, size);
  });
  const savedBgStyle = localStorage.getItem("flowchart-bg-style") || "grid";
  const savedFontBoldness = localStorage.getItem("flowchart-font-boldness") || "normal";
  const savedFontSize = localStorage.getItem("flowchart-font-size") || "medium";
  backgroundStyleSelect.value = savedBgStyle;
  fontStyleSelect.value = savedFontBoldness;
  changeBackgroundStyle(savedBgStyle);
  changeFontStyle(savedFontBoldness, savedFontSize);
  canvasContent.classList.add("bg-grid");

  // إعداد زر تبديل الشريط الجانبي
  const toggleButton = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggleButton && sidebar) {
    toggleButton.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // دعم الأجهزة المحمولة في اختيار الأدوات
  let selectedShape = null;
  sidebarTools.forEach(tool => {
    tool.addEventListener("click", function () {
      selectedShape = this.dataset.shape;
      sidebarTools.forEach(t => t.classList.remove("selected-tool"));
      this.classList.add("selected-tool");
      canvasContent.style.cursor = "crosshair";
      showMessage("انقر على اللوحة لوضع عنصر " + this.textContent.trim());
    });
  });
  canvasContent.addEventListener("click", (e) => {
    if (!selectedShape) return;
    const rect = canvasContent.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    createNode(selectedShape, x, y, null, "", true);
    selectedShape = null;
    sidebarTools.forEach(t => t.classList.remove("selected-tool"));
    canvasContent.style.cursor = "default";
    hideMessage();
  });
  canvasContent.addEventListener("touchend", (e) => {
    if (selectedShape) {
      e.preventDefault();
      const rect = canvasContent.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const x = (touch.clientX - rect.left) / scale;
      const y = (touch.clientY - rect.top) / scale;
      createNode(selectedShape, x, y, null, "", true);
      selectedShape = null;
      sidebarTools.forEach(t => t.classList.remove("selected-tool"));
      canvasContent.style.cursor = "default";
      hideMessage();
    }
  }, { passive: false });

  // إضافة رسالة مؤقتة للمستخدم
  const styleElem = document.createElement("style");
  styleElem.textContent = `
    .selected-tool {
      background-color: #3498db;
      color: white;
      box-shadow: 0 0 5px rgba(52, 152, 219, 0.7);
    }
    #message-box {
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(52, 152, 219, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition: opacity 0.3s;
      opacity: 0;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleElem);
  const messageBox = document.createElement("div");
  messageBox.id = "message-box";
  document.body.appendChild(messageBox);
  function showMessage(text) {
    messageBox.textContent = text;
    messageBox.style.opacity = "1";
    setTimeout(hideMessage, 3000);
  }
  function hideMessage() {
    messageBox.style.opacity = "0";
  }
});
