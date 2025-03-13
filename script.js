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

/* إضافة المتغيرات في بداية script.js بعد المتغيرات الأخرى */
const backgroundStyleSelect = document.getElementById("backgroundStyleSelect");
const fontStyleSelect = document.getElementById("fontStyleSelect");

/* إضافة هذه الوظائف بعد دالة clearProject() */

/* دالة لتغيير نمط الخلفية */
function changeBackgroundStyle(style) {
  // إزالة جميع أنماط الخلفية الحالية
  canvasContent.classList.remove("bg-grid", "bg-dots", "bg-lines", "bg-none");
  // إضافة النمط الجديد
  canvasContent.classList.add(`bg-${style}`);

  // حفظ الإعداد في التخزين المحلي للمتصفح
  localStorage.setItem("flowchart-bg-style", style);
}

/* دالة لتغيير نمط الخط */
function changeFontStyle(boldness) {
  // التعامل مع سماكة الخط
  document.querySelectorAll(".node .node-label").forEach((label) => {
    label.classList.remove("font-bold", "font-normal");
    label.classList.add(`font-${boldness}`);
  });

  // التعامل مع حجم الخط
  document.querySelectorAll(".node .node-label").forEach((label) => {
    label.classList.remove("font-small", "font-medium", "font-large");
  });

  // حفظ الإعدادات في التخزين المحلي للمتصفح
  localStorage.setItem("flowchart-font-boldness", boldness);
}

/* متغير لتخزين الخط المؤقت للربط */
let tempConnectionLine = null;

/* متغيرات رئيسية */
let nodes = [];
let connections = [];
let isConnecting = false;
let sourcePortData = null;
let scale = 1;
const scaleStep = 0.1;

let currentDraggingNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let historyStates = [];
let historyIndex = -1;

/*
  دالة لتحديث حجم الخلفية البيانية (canvas-content) بناءً على مواقع العقد،
  بحيث تزداد الأبعاد إذا انتقلت العقد خارج الحجم الافتراضي.
  هنا نستخدم offsetWidth و offsetHeight للحصول على القيم الأصلية للعقد.
*/
// function updateCanvasSize() {
//   let maxX = 1600; // العرض الافتراضي كما في CSS
//   let maxY = 1200; // الارتفاع الافتراضي كما في CSS
//   nodes.forEach((node) => {
//     const nodeWidth = node.el.offsetWidth;
//     const nodeHeight = node.el.offsetHeight;
//     const nodeRight = node.x + nodeWidth;
//     const nodeBottom = node.y + nodeHeight;
//     if (nodeRight > maxX) maxX = nodeRight;
//     if (nodeBottom > maxY) maxY = nodeBottom;
//   });
//   // إضافة هامش إضافي للتأكد من ظهور مساحة فارغة
//   canvasContent.style.width = (maxX + 100) + "px";
//   canvasContent.style.height = (maxY + 100) + "px";
// }
function updateCanvasSize() { // دالة لتحديث حجم اللوحة
  const minWidth = 1200; // تعيين الحد الأدنى للعرض بـ 1600 بكسل
  const minHeight = 1200; // تعيين الحد الأدنى للارتفاع بـ 1200 بكسل
  const margin = 100; // تعيين الهامش الإضافي بـ 100 بكسل
  
  if (nodes.length === 0) { // التحقق مما إذا كانت قائمة العناصر فارغة
    canvasContent.style.width = minWidth + "px"; // تعيين عرض اللوحة إلى الحد الأدنى
    canvasContent.style.height = minHeight + "px"; // تعيين ارتفاع اللوحة إلى الحد الأدنى
    // تعيين حجم شبكة افتراضي ثابت
    //canvasContent.style.backgroundSize = "20px 20px";  تعيين حجم شبكة الخلفية إلى 20 بكسل للعرض والارتفاع
    return; // إنهاء الدالة إذا لم توجد عناصر
  }

  let minX = Infinity, // تهيئة المتغير لتخزين أصغر قيمة X وتعيينها إلى ما لا نهاية
    minY = Infinity; // تهيئة المتغير لتخزين أصغر قيمة Y وتعيينها إلى ما لا نهاية
  let maxX = -Infinity, // تهيئة المتغير لتخزين أكبر قيمة X وتعيينها إلى سالب ما لا نهاية
    maxY = -Infinity; // تهيئة المتغير لتخزين أكبر قيمة Y وتعيينها إلى سالب ما لا نهاية

  nodes.forEach((node) => { // التكرار على كل عنصر في قائمة nodes
    const nodeWidth = node.el.offsetWidth; // الحصول على عرض العنصر الحالي
    const nodeHeight = node.el.offsetHeight; // الحصول على ارتفاع العنصر الحالي
    minX = Math.min(minX, node.x); // تحديث أقل قيمة X بمقارنة القيمة الحالية وموضع العنصر
    minY = Math.min(minY, node.y); // تحديث أقل قيمة Y بمقارنة القيمة الحالية وموضع العنصر
    maxX = Math.max(maxX, node.x + nodeWidth); // تحديث أكبر قيمة X بمقارنة القيمة الحالية وموضع العنصر بالإضافة إلى عرضه
    maxY = Math.max(maxY, node.y + nodeHeight); // تحديث أكبر قيمة Y بمقارنة القيمة الحالية وموضع العنصر بالإضافة إلى ارتفاعه
  });

  const offsetX = minX < 0 ? Math.abs(minX) + margin / 2 : 0; // حساب الإزاحة الأفقية إذا كانت أقل من 0، مع إضافة نصف الهامش
  const offsetY = minY < 0 ? Math.abs(minY) + margin / 2 : 0; // حساب الإزاحة الرأسية إذا كانت أقل من 0، مع إضافة نصف الهامش

  const newWidth = Math.max(maxX + offsetX + margin / 2, minWidth); // حساب العرض الجديد بأخذ أقصى قيمة X، الإزاحة الإضافية ونصف الهامش، مع التأكد أنه لا يقل عن الحد الأدنى
  const newHeight = Math.max(maxY + offsetY + margin / 2, minHeight); // حساب الارتفاع الجديد بأخذ أقصى قيمة Y، الإزاحة الإضافية ونصف الهامش، مع التأكد أنه لا يقل عن الحد الأدنى

  canvasContent.style.width = newWidth + "px"; // تعيين العرض الجديد للوحة
  canvasContent.style.height = newHeight + "px"; // تعيين الارتفاع الجديد للوحة
}

/* دوال التراجع والإعادة */
function pushState() {
  const state = {
    nodes: JSON.parse(
      JSON.stringify(
        nodes.map((n) => ({
          id: n.id,
          shape: n.shape,
          x: n.x,
          y: n.y,
          content: n.content || "",
        }))
      )
    ),
    connections: JSON.parse(JSON.stringify(connections)),
  };
  // التحقق من اختلاف الحالة عن الحالة السابقة لتجنب التكرار
  if (historyStates.length > 0) {
    const lastState = historyStates[historyStates.length - 1];
    if (JSON.stringify(lastState) === JSON.stringify(state)) {
      return;
    }
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

/* تحجيم (Zoom) */
function zoomIn() {
  scale += scaleStep;
  canvasContent.style.transform = `scale(${scale})`;
}

function zoomOut() {
  if (scale > scaleStep) {
    scale -= scaleStep;
    canvasContent.style.transform = `scale(${scale})`;
  }
}

/* تصدير المشروع كصورة باستخدام مكتبة html2canvas */
function exportProject() {
  import(
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
  )
    .then(() => {
      html2canvas(canvasContent, { scale: 2 }).then((canvas) => {
        const link = document.createElement("a");
        // استخدام اسم المشروع المُدخل (عن طريق textContent) وإلا يتم استخدام "untitled.png"
        link.download = projectNameInput.textContent.trim()
          ? projectNameInput.textContent.trim() + ".png"
          : "untitled.png";
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

/* تهيئة أزرار التولبار */
undoBtn?.addEventListener("click", undo);
redoBtn?.addEventListener("click", redo);
zoomInBtn?.addEventListener("click", zoomIn);
zoomOutBtn?.addEventListener("click", zoomOut);
exportBtn?.addEventListener("click", exportProject);
clearBtn?.addEventListener("click", clearProject);

/* تهيئة سحب الأدوات من الشريط الجانبي */
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

/* دالة مساعدة لتحديد موقع المنفذ من عنصر البورت */
function getPortPositionFromPort(port) {
  if (port.classList.contains("top")) return "top";
  if (port.classList.contains("bottom")) return "bottom";
  if (port.classList.contains("left")) return "left";
  if (port.classList.contains("right")) return "right";
  if (port.classList.contains("bottom-left")) return "bottom-left";
  if (port.classList.contains("bottom-right")) return "bottom-right";
  return "top";
}

/* دالة لإنشاء نقطة اتصال */
function createPort(portType, position) {
  const port = document.createElement("div");
  port.classList.add("port", position);
  port.dataset.portType = portType;

  port.addEventListener("click", (e) => {
    const currentPortPos = getPortPositionFromPort(port);
    const currentNodeId = port.parentElement.dataset.id;

    // إذا لم تكن هناك عملية اتصال جارية، نبدأ واحدة
    if (!isConnecting) {
      isConnecting = true;
      sourcePortData = {
        nodeId: currentNodeId,
        position: currentPortPos,
      };
      port.classList.add("selected-port");
    }
    // إذا كانت عملية الربط جارية، نحاول إتمام الربط
    else if (sourcePortData) {
      // التأكد من عدم الربط بنفس النقطة أو بنفس العقدة
      if (
        sourcePortData.nodeId === currentNodeId &&
        sourcePortData.position === currentPortPos
      ) {
        resetConnectionProcess();
        return;
      }
      createConnection(sourcePortData, {
        nodeId: currentNodeId,
        position: currentPortPos,
      });
      resetConnectionProcess();
      pushState();
    }
    e.stopPropagation();
  });

  return port;
}

/* إعادة تعيين عملية الربط وإزالة التأثيرات */
function resetConnectionProcess() {
  isConnecting = false;
  document
    .querySelectorAll(".port.selected-port")
    .forEach((p) => p.classList.remove("selected-port"));
  sourcePortData = null;
  if (tempConnectionLine) {
    tempConnectionLine.remove();
    tempConnectionLine = null;
  }
}

/* إنشاء عقدة جديدة */
function createNode(
  shape,
  x,
  y,
  customId = null,
  content = "",
  pushHistory = true
) {
  const shapeMapping = {
    decision: "diamond",
    "input-output": "parallelogram",
    connector: "circle",
  };
  const actualShape = shape;
  const cssShape = shapeMapping[shape] || shape;

  const nodeId = customId || `node-${Date.now()}`;
  const nodeEl = document.createElement("div");
  nodeEl.classList.add("node", cssShape);
  nodeEl.dataset.id = nodeId;

  // const label = document.createElement("div");
  // label.classList.add("node-label");
  // label.contentEditable = true;
  // label.textContent = content || actualShape;
  // nodeEl.appendChild(label);
  const label = document.createElement("div");
  label.classList.add("node-label");

  // إضافة أنماط الخط المحددة للعقدة الجديدة
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
      // تعديل شكل loop: إزالة الأيقونة الإضافية لتبسيط الشكل
      nodeEl.appendChild(createPort("in", "top"));
      nodeEl.appendChild(createPort("out", "bottom"));
      // nodeEl.appendChild(createPort("out", "right"));
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

  const nodeData = {
    id: nodeId,
    shape: actualShape,
    x: x,
    y: y,
    el: nodeEl,
    content: label.textContent,
  };
  nodes.push(nodeData);

  // تفعيل سحب العقدة باستخدام الماوس واللمس
  nodeEl.addEventListener("mousedown", (e) => {
    if (
      e.target.classList.contains("port") ||
      e.target.classList.contains("delete-btn")
    )
      return;
    currentDraggingNode = nodeData;
    const rect = nodeEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });

  nodeEl.addEventListener(
    "touchstart",
    (e) => {
      if (
        e.target.classList.contains("port") ||
        e.target.classList.contains("delete-btn")
      )
        return;
      currentDraggingNode = nodeData;
      const touch = e.touches[0];
      const rect = nodeEl.getBoundingClientRect();
      dragOffsetX = touch.clientX - rect.left;
      dragOffsetY = touch.clientY - rect.top;
      e.preventDefault();
    },
    { passive: false }
  );

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
// function drawConnections() {
//   connectionsSvg.innerHTML = "";
//   connections.forEach(conn => {
//     const sourceCoords = getPortCoordinates(conn.source.nodeId, conn.source.position);
//     const targetCoords = getPortCoordinates(conn.target.nodeId, conn.target.position);
//     const pathD = generatePathD(sourceCoords.x, sourceCoords.y, targetCoords.x, targetCoords.y);
//     const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
//     path.setAttribute("d", pathD);
//     path.setAttribute("class", "connection-line");
//     // التأكد من ظهور السهم في نهاية الوصلة
//     path.setAttribute("marker-end", "url(#arrow)");
//     const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
//     group.appendChild(path);

//         // التأكد من ظهور علامة الـ "×" فوق كل وصلة
//     // const deleteBtn = document.createElementNS("http://www.w3.org/2000/svg", "text");
//     // deleteBtn.setAttribute("x", (sourceCoords.x + targetCoords.x) / 2);
//     // deleteBtn.setAttribute("y", (sourceCoords.y + targetCoords.y) / 2);
//     // deleteBtn.setAttribute("class", "delete-connection-btn");
//     // deleteBtn.textContent = "×";
//     // deleteBtn.addEventListener("click", () => {
//     //   deleteConnection(conn);
//     //   pushState();
//     // });
//     // group.appendChild(deleteBtn);

//     connectionsSvg.appendChild(group);
//   });
// }
function drawConnections() {
  // البحث عن قسم <defs> الحالي داخل الـ SVG
  let defs = connectionsSvg.querySelector("defs");

  // مسح محتوى الـ SVG بالكامل
  connectionsSvg.innerHTML = "";

  // إذا لم يكن قسم الـ <defs> موجودًا، نقوم بإنشائه
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#2c3e50"></path>
      </marker>
    `;
  }

  // إعادة إضافة قسم الـ <defs> للـ SVG
  connectionsSvg.appendChild(defs);

  // رسم الوصلات الجديدة
  connections.forEach((conn) => {
    const sourceCoords = getPortCoordinates(
      conn.source.nodeId,
      conn.source.position
    );
    const targetCoords = getPortCoordinates(
      conn.target.nodeId,
      conn.target.position
    );
    const pathD = generatePathD(
      sourceCoords.x,
      sourceCoords.y,
      targetCoords.x,
      targetCoords.y
    );
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("class", "connection-line");
    // التأكد من ظهور السهم في نهاية الوصلة
    path.setAttribute("marker-end", "url(#arrow)");
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.appendChild(path);
    connectionsSvg.appendChild(group);
  });
}

/* توليد مسار منحني */
// function generatePathD(x1, y1, x2, y2) {
//   const dx = x2 - x1;
//   const dy = y2 - y1;
//   const cp1x = x1 + dx * 0.3;
//   const cp1y = y1;
//   const cp2x = x2 - dx * 0.3;
//   const cp2y = y2;
//   return `M ${x1},${y1} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
// }
/**
 * توليد مسار SVG ذكي مع خيارات متعددة لتخصيص شكل المنحنى.
 *
 * @param {number} x1 - إحداثي x للنقطة الأولى.
 * @param {number} y1 - إحداثي y للنقطة الأولى.
 * @param {number} x2 - إحداثي x للنقطة الثانية.
 * @param {number} y2 - إحداثي y للنقطة الثانية.
 * @param {object} [options={}] - كائن الخيارات لتعديل المسار.
 * @param {("smart"|"smooth"|"angled"|"zigzag")} [options.mode="smart"] - نمط الرسم:
 *    - "smart": يعتمد على الفروقات بين النقطتين؛ إذا كان الفرق الأفقي/العمودي كبيراً يرسم مساراً متعرجاً، وإلا يستخدم منحنى بيزير سلس.
 *    - "smooth": يرسم دائماً منحنى بيزير سلس.
 *    - "angled": يرسم دائماً مساراً بزوايا قائمة (خطوط مستقيمة متعرجة).
 *    - "zigzag": يرسم مساراً متعرجاً بنمط متعرج (Zigzag) مع نقاط وسيطة.
 * @param {number} [options.curvature=0.3] - نسبة تحدد موقع نقاط التحكم على الخط المستقيم.
 * @param {number} [options.offset=20] - قيمة الإزاحة العمودية (بالبكسل) لنقاط التحكم عند استخدام المنحنى السلس.
 * @param {number} [options.zigzagAmplitude=10] - قيمة انحراف نقاط النمط المتعرج (تنطبق في وضع "zigzag").
 * @param {number} [options.zigzagFrequency=2] - عدد التقلبات في النمط المتعرج (تنطبق في وضع "zigzag").
 * @returns {string} سلسلة المسار الخاصة بـ SVG.
 */
function generatePathD(x1, y1, x2, y2, options = {}) {
  const {
    mode = "smart",
    curvature = 0.3,
    offset = 20,
    zigzagAmplitude = 10,
    zigzagFrequency = 2,
  } = options;

  const dx = x2 - x1;
  const dy = y2 - y1;

  // حالة رسم خطوط بزوايا قائمة
  if (mode === "angled") {
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      // اتجاه أفقي
      const midX = x1 + dx / 2;
      return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      // اتجاه عمودي
      const midY = y1 + dy / 2;
      return `M ${x1},${y1} L ${x1},${midY} L ${x2},${midY} L ${x2},${y2}`;
    } else {
      // حالة مختلطة: استخدام تقاطع النقاط
      const midX = x1 + dx / 2;
      const midY = y1 + dy / 2;
      return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    }
  }
  // حالة رسم منحنى بيزير سلس
  else if (mode === "smooth") {
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
  // حالة رسم نمط متعرج (zigzag)
  else if (mode === "zigzag") {
    const segments = zigzagFrequency * 2 + 1;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      // تطبيق إزاحة على النقاط الفردية (باستثناء البداية والنهاية)
      if (i % 2 === 1) {
        const theta = Math.atan2(dy, dx);
        const perpAngle = theta - Math.PI / 2;
        // تعويض بدور متناوب (أعلى وأسفل)
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
  }
  // الوضع "smart": يختار بين الأنماط بناءً على نسب dx و dy
  else if (mode === "smart") {
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
  }
  // الوضع الافتراضي: استخدام المنحنى السلس
  else {
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

/* الأحداث العالمية للسحب باستخدام الماوس */
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
  // تحديث الخط المؤقت للربط أثناء تحريك الماوس
  if (isConnecting && sourcePortData) {
    const canvasRect = canvasContent.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / scale;
    const mouseY = (e.clientY - canvasRect.top) / scale;
    const sourceCoords = getPortCoordinates(
      sourcePortData.nodeId,
      sourcePortData.position
    );
    const pathD = generatePathD(sourceCoords.x, sourceCoords.y, mouseX, mouseY);
    if (!tempConnectionLine) {
      tempConnectionLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      tempConnectionLine.setAttribute("class", "connection-line pending");
      // إضافة attribute لعرض السهم في نهاية الخط المؤقت
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

document.addEventListener(
  "touchmove",
  (e) => {
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
  },
  { passive: false }
);

document.addEventListener("touchend", () => {
  if (currentDraggingNode) {
    currentDraggingNode = null;
    pushState();
    updateCanvasSize();
  }
});

/* إلغاء عملية الربط عند الضغط على مفتاح Escape */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isConnecting) {
    resetConnectionProcess();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // حفظ الحالة الفارغة في سجل التراجع عند بدء التطبيق
  pushState();
});

/* أضف أيضاً في نهاية الكود بعد معالج حدث DOMContentLoaded */
document.addEventListener("DOMContentLoaded", function () {
  // حفظ الحالة الفارغة في سجل التراجع عند بدء التطبيق
  pushState();

  // تهيئة أحداث تغيير نمط الخلفية والخط
  backgroundStyleSelect.addEventListener("change", () => {
    changeBackgroundStyle(backgroundStyleSelect.value);
  });

  fontStyleSelect.addEventListener("change", () => {
    changeFontStyle(fontStyleSelect.value);
  });

  // استعادة الإعدادات المحفوظة
  const savedBgStyle = localStorage.getItem("flowchart-bg-style") || "grid";
  const savedFontBoldness =
    localStorage.getItem("flowchart-font-boldness") || "normal";
  const savedFontSize = localStorage.getItem("flowchart-font-size") || "medium";

  // تعيين القيم المحفوظة في عناصر التحكم
  backgroundStyleSelect.value = savedBgStyle;
  fontStyleSelect.value = savedFontBoldness;

  // تطبيق الإعدادات المحفوظة
  changeBackgroundStyle(savedBgStyle);
  changeFontStyle(savedFontBoldness, savedFontSize);

  // إضافة الفئة الافتراضية للخلفية
  canvasContent.classList.add("bg-grid");
});

// تأكد من تنفيذ الكود بعد تحميل صفحة الويب بالكامل
document.addEventListener('DOMContentLoaded', function() {
  // تحديد زر التبديل والشريط الجانبي
  const toggleButton = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  // التأكد من وجود العناصر المطلوبة
  if (toggleButton && sidebar) {
    // عند النقر على زر التبديل، يتم تبديل الصنف "active" للشريط الجانبي
    toggleButton.addEventListener('click', function() {
      sidebar.classList.toggle('active');
    });
  }
});

// أضف هذا الكود في نهاية ملف script.js

document.addEventListener('DOMContentLoaded', function() {
  // الحصول على جميع أدوات الشريط الجانبي والكانفاس
  const sidebarTools = document.querySelectorAll('.tool');
  const canvasContent = document.getElementById('canvasContent');
  
  // تعريف المتغيرات الضرورية
  let selectedShape = null;
  
  // بديل أبسط: استخدام نظام انقر-واسحب بدلاً من السحب والإفلات التقليدي على الجوال
  sidebarTools.forEach(tool => {
    // استخدام حدث النقر بدلاً من اللمس
    tool.addEventListener('click', function() {
      // تحديد الشكل المُختار
      selectedShape = this.dataset.shape;
      
      // إضافة فئة مرئية للعنصر المُختار
      sidebarTools.forEach(t => t.classList.remove('selected-tool'));
      this.classList.add('selected-tool');
      
      // تغيير مؤشر الماوس على الكانفاس للإشارة إلى أنه يمكن وضع العنصر
      canvasContent.style.cursor = 'crosshair';
      
      // إظهار رسالة للمستخدم (اختياري)
      showMessage('انقر على اللوحة لوضع عنصر ' + this.textContent.trim());
    });
  });
  
  // معالجة النقر على الكانفاس لوضع العنصر
  canvasContent.addEventListener('click', function(e) {
    // التحقق من وجود شكل مُختار
    if (!selectedShape) return;
    
    // حساب إحداثيات الموضع
    const rect = canvasContent.getBoundingClientRect();
    
    // حساب الإحداثيات المناسبة مع مراعاة التكبير/التصغير والتمرير
    let x, y;
    
    if (e.type === 'click') {
      // حدث نقر عادي (ماوس)
      x = (e.clientX - rect.left) / scale;
      y = (e.clientY - rect.top) / scale;
    } else {
      // حدث لمس (لا يستخدم حالياً ولكن يمكن استخدامه لاحقاً)
      const touch = e.touches[0];
      x = (touch.clientX - rect.left) / scale;
      y = (touch.clientY - rect.top) / scale;
    }
    
    // إنشاء العقدة في الموضع المحدد
    createNode(selectedShape, x, y, null, "", true);
    
    // إعادة تعيين الحالة
    selectedShape = null;
    sidebarTools.forEach(t => t.classList.remove('selected-tool'));
    canvasContent.style.cursor = 'default';
    
    // إخفاء الرسالة (إذا كانت مرئية)
    hideMessage();
  });
  
  // معالجة اللمس على الكانفاس للأجهزة اللمسية
  canvasContent.addEventListener('touchend', function(e) {
    // منع السلوك الافتراضي لتجنب التكبير أو التمرير
    if (selectedShape) {
      e.preventDefault();
      
      // حساب إحداثيات الموضع
      const rect = canvasContent.getBoundingClientRect();
      const touch = e.changedTouches[0];
      
      const x = (touch.clientX - rect.left) / scale;
      const y = (touch.clientY - rect.top) / scale;
      
      // إنشاء العقدة في الموضع المحدد
      createNode(selectedShape, x, y, null, "", true);
      
      // إعادة تعيين الحالة
      selectedShape = null;
      sidebarTools.forEach(t => t.classList.remove('selected-tool'));
      canvasContent.style.cursor = 'default';
      
      // إخفاء الرسالة (إذا كانت مرئية)
      hideMessage();
    }
  }, { passive: false });
  
  // إضافة الأنماط CSS للأدوات المُختارة ورسائل المساعدة
  const style = document.createElement('style');
  style.textContent = `
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
  document.head.appendChild(style);
  
  // إضافة صندوق الرسائل إلى DOM
  const messageBox = document.createElement('div');
  messageBox.id = 'message-box';
  document.body.appendChild(messageBox);
  
  // دوال مساعدة للرسائل
  function showMessage(text) {
    messageBox.textContent = text;
    messageBox.style.opacity = '1';
    // إخفاء الرسالة تلقائياً بعد 3 ثوانٍ
    setTimeout(hideMessage, 3000);
  }
  
  function hideMessage() {
    messageBox.style.opacity = '0';
  }
});
