// === DOM Elements ===
const algorithmSelect = document.getElementById("algorithm");
const pidInput = document.getElementById("pid");
const burstInput = document.getElementById("burstTime");
const arrivalInput = document.getElementById("arrivalTime");
const quantumInput = document.getElementById("quantum");
const quantumLabel = document.getElementById("quantum-label");
const addButton = document.getElementById("addProcess");
const runButton = document.getElementById("runScheduler");
const resetButton = document.getElementById("reset");
const tableBody = document.querySelector("#processTable tbody");
const ganttChart = document.getElementById("ganttChart");

let processes = [];
let ganttIndex = 0;

// === Toggle Time Quantum Field ===
algorithmSelect.addEventListener("change", () => {
  const show = algorithmSelect.value === "RR";
  quantumInput.style.display = show ? "inline-block" : "none";
  quantumLabel.style.display = show ? "inline-block" : "none";
});

// === Add Process ===
addButton.addEventListener("click", () => {
  const pid = pidInput.value.trim();
  const burst = parseInt(burstInput.value);
  const arrival = parseInt(arrivalInput.value);

  if (!pid || isNaN(burst) || isNaN(arrival)) {
    alert("Please fill all fields correctly.");
    return;
  }
  processes.push({ pid, burst, arrival });
  updateTable();

  pidInput.value = "";
  burstInput.value = "";
  arrivalInput.value = "";
});

// === Update Process Table ===
function updateTable() {
  tableBody.innerHTML = "";
  processes.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.burst}</td>
      <td>${p.arrival}</td>
    `;
    tableBody.appendChild(row);
  });
}

// === Run Scheduler Button ===
runButton.addEventListener("click", () => {
  const selectedAlgo = algorithmSelect.value;
  if (processes.length === 0) {
    alert("Add at least one process.");
    return;
  }
  switch (selectedAlgo) {
    case "FCFS":
      runFCFS();
      break;
    case "SJF":
      runSJF();
      break;
    case "RR":
      runRR();
      break;
    default:
      alert("Selected algorithm not implemented yet.");
  }
});

// === Gantt Chart Block ===
// function createGanttBlock(pid, start, end) {
//   const block = document.createElement("div");
//   block.className = "gantt-bar";
//   block.innerText = `${pid}\n${start}-${end}`;
//   block.style.animationDelay = `${ganttIndex * 0.1}s`;
//   ganttChart.appendChild(block);
//   ganttIndex++;
// }
function createGanttBlock(pid, start, end) {
    const colors = {
      P1: "#2196f3",
      P2: "#4caf50",
      P3: "#ff9800",
      P4: "#9c27b0",
      P5: "#f44336",
    };


  const block = document.createElement("div");
  block.style.backgroundColor = colors[pid] || "#607d8b";
  block.className = "gantt-bar";
  block.style.width = `${(end - start) * 30}px`; // scale width

    block.innerHTML = `
        <div class="bar-content">
          <div class="bar-pid">${pid}</div>
          <div class="bar-time">${start} - ${end}</div>
        </div>
    `;
  ganttChart.appendChild(block);
}

// === FCFS Scheduling ===
function runFCFS() {
  const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
  let currentTime = 0;
  ganttChart.innerHTML = "";
  ganttIndex = 0;
  const completed = [];

  sorted.forEach((p) => {
    const startTime = Math.max(currentTime, p.arrival);
    const endTime = startTime + p.burst;
    createGanttBlock(p.pid, startTime, endTime);
    completed.push({
      pid: p.pid,
      burst: p.burst,
      arrival: p.arrival,
      completion: endTime,
    });
    currentTime = endTime;
  });

  updateMetrics(completed);
}

// === SJF (Non-Preemptive) Scheduling ===
function runSJF() {
  const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
  const remaining = [...sorted];
  let currentTime = 0;
  ganttChart.innerHTML = "";
  ganttIndex = 0;
  const completed = [];

  while (remaining.length > 0) {
    const available = remaining.filter((p) => p.arrival <= currentTime);
    let next;
    if (available.length > 0) {
      next = available.reduce((a, b) => (a.burst < b.burst ? a : b));
    } else {
      next = remaining[0];
      currentTime = next.arrival;
    }
    const startTime = currentTime;
    const endTime = startTime + next.burst;
    createGanttBlock(next.pid, startTime, endTime);

    currentTime = endTime;
    completed.push({
      pid: next.pid,
      burst: next.burst,
      arrival: next.arrival,
      completion: endTime,
    });
    remaining.splice(remaining.indexOf(next), 1);
  }
  updateMetrics(completed);
}

// === RR Scheduling ===
function runRR() {
  const quantum = parseInt(quantumInput.value);
  if (isNaN(quantum) || quantum <= 0) {
    alert("Enter a valid time quantum.");
    return;
  }
  const arrived = [...processes].sort((a, b) => a.arrival - b.arrival);
  const remaining = arrived.map((p) => ({
    ...p,
    remaining: p.burst,
    completion: null,
  }));
  const queue = [];
  let currentTime = 0;
  let index = 0;
  ganttChart.innerHTML = "";
  ganttIndex = 0;

  while (remaining.some(p => p.remaining > 0) || queue.length > 0) {
    while (index < remaining.length && remaining[index].arrival <= currentTime) {
      queue.push(remaining[index]);
      index++;
    }
    if (queue.length === 0) {
      if (index < remaining.length) {
        currentTime = remaining[index].arrival;
      }
      continue;
    }
    const current = queue.shift();
    const execTime = Math.min(current.remaining, quantum);
    const startTime = currentTime;
    const endTime = startTime + execTime;

    createGanttBlock(current.pid, startTime, endTime);

    current.remaining -= execTime;
    currentTime = endTime;

    // Add newly arrived during execution
    while (index < remaining.length && remaining[index].arrival <= currentTime) {
      queue.push(remaining[index]);
      index++;
    }
    if (current.remaining > 0) {
      queue.push(current);
    } else {
      current.completion = currentTime;
    }
  }
  const completed = remaining.map(p => ({
    pid: p.pid,
    burst: p.burst,
    arrival: p.arrival,
    completion: p.completion,
  }));
  updateMetrics(completed);
}


// === Update Metrics Table ===
function updateMetrics(completed) {
  const tbody = document.querySelector("#metricsTable tbody");
  tbody.innerHTML = "";

  let totalWT = 0, totalTAT = 0;
  completed.forEach((p) => {
    const tat = p.completion - p.arrival;
    const wt = tat - p.burst;
    totalWT += wt;
    totalTAT += tat;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.completion}</td>
      <td>${tat}</td>
      <td>${wt}</td>
    `;
    tbody.appendChild(row);
  });

  const avgWT = (totalWT / completed.length).toFixed(2);
  const avgTAT = (totalTAT / completed.length).toFixed(2);
  document.getElementById("metricsSummary").textContent =
    `Average Turnaround Time: ${avgTAT} | Average Waiting Time: ${avgWT}`;
}

// === Reset Functionality ===
resetButton.addEventListener("click", () => {
  processes = [];
  tableBody.innerHTML = "";
  ganttChart.innerHTML = "";
  document.getElementById("metricsTable").querySelector("tbody").innerHTML = "";
  document.getElementById("metricsSummary").textContent = "";
  pidInput.value = "";
  burstInput.value = "";
  arrivalInput.value = "";
  quantumInput.value = "";
  ganttIndex = 0;
});

// === Dark Mode Toggle ===
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  themeToggle.textContent = document.body.classList.contains("dark-mode")
    ? "☀️ Toggle Light Mode"
    : "🌙 Toggle Dark Mode";
});