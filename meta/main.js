let data = [];
let commits = [];

let xScale = d3.scaleTime();
let yScale = d3.scaleLinear();

function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        configurable: false,
        enumerable: false,
      });

      return ret;
    });

  console.log(commits);
}

function updateTooltipContent(commit) {
  const tooltip = document.getElementById('commit-tooltip');
  const link = document.getElementById('commit-link');
  const dateElem = document.getElementById('commit-date');
  const timeElem = document.getElementById('commit-time');
  const authorElem = document.getElementById('commit-author');
  const linesElem = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) {
    tooltip.style.display = 'none';
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  dateElem.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  timeElem.textContent = commit.time;
  authorElem.textContent = commit.author;
  linesElem.textContent = commit.totalLines;

  tooltip.style.display = 'block';
  tooltip.style.top = `${event.clientY + 10}px`;
  tooltip.style.left = `${event.clientX + 10}px`;
}

function displayStats() {
  processCommits();

  d3.select(".summary-grid").html("");

  let totalLOC = data.length;
  let totalCommits = commits.length;
  let numFiles = new Set(data.map((d) => d.file)).size;
  let maxDepth = d3.max(data, (d) => d.depth);
  let longestLine = d3.max(data, (d) => d.length);
  let maxLines = d3.max(d3.rollup(data, v => v.length, d => d.file).values());

  let statsData = [
    { label: "Commits", value: totalCommits },
    { label: "Files", value: numFiles },
    { label: "Total LOC", value: totalLOC },
    { label: "Max Depth", value: maxDepth },
    { label: "Longest Line", value: longestLine },
    { label: "Max Lines", value: maxLines }
  ];

  const grid = d3.select(".summary-grid");

  statsData.forEach(({ label, value }) => {
    let statBlock = grid.append("div").attr("class", "stat-item");
    statBlock.append("div").attr("class", "stat-label").text(label);
    statBlock.append("div").attr("class", "stat-value").text(value);
  });
}

async function loadData() {
  data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
    file: row.file,
  }));

  displayStats();
}

function createScatter() {
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const width = 1000;
  const height = 600;

  // Configure global scales
  xScale.domain(d3.extent(commits, (d) => d.datetime)).range([0, width]).nice();
  yScale.domain([0, 24]).range([height, 0]);

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update scales to fit within the usable area
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // Add gridlines
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
                  .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Sort commits so larger circles render first
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Create group for dots
  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, commit) {
      d3.select(this).style('fill-opacity', 1);
      updateTooltipContent(commit);
    })
    .on('mouseleave', function (event, commit) {
      d3.select(this).style('fill-opacity', 0.7);
      updateTooltipContent({});
    });
}

function brushSelector() {
    const svg = d3.select('svg');
    const viewBox = svg.attr("viewBox").split(" ").map(Number);
    const width = viewBox[2];
    const height = viewBox[3];
  
    const brushGroup = svg.append('g').attr('class', 'brush');
    let brushSelection = null;
  
    const brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on('brush end', brushed);
  
    brushGroup.call(brush);
  
    function brushed(event) {
      brushSelection = event.selection;
      updateSelection();
      updateSelectionCount();
      updateLanguageBreakdown();
    }
  
    function isCommitSelected(commit) {
      if (!brushSelection) return false;
      const [[x0, y0], [x1, y1]] = brushSelection;
      const x = xScale(commit.datetime);
      const y = yScale(commit.hourFrac);
      return x0 <= x && x <= x1 && y0 <= y && y <= y1;
    }
  
    function updateSelection() {
      d3.selectAll('circle')
        .classed('selected', (d) => isCommitSelected(d))
        .attr('fill', (d) => (isCommitSelected(d) ? 'orange' : 'steelblue'));
    }
  
    function updateSelectionCount() {
      const countElement = document.getElementById('selection-count');
  
      // If no brush selection, clear the text
      if (!brushSelection) {
        countElement.textContent = '';
        return;
      }
  
      const selectedCommits = commits.filter(isCommitSelected);
      countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    }
  
    function updateLanguageBreakdown() {
        const container = document.getElementById('language-breakdown');
      
        // If no brush selection, clear the container
        if (!brushSelection) {
          container.innerHTML = '';
          return;
        }
      
        const selectedCommits = commits.filter(isCommitSelected);
        if (selectedCommits.length === 0) {
          container.innerHTML = '<p>No commits selected</p>';
          return;
        }
      
        const lines = selectedCommits.flatMap((d) => d.lines);
        const breakdown = d3.rollup(
          lines,
          (v) => v.length,
          (d) => d.type
        );
      
        // Removed the line that displays the commit count again
        container.innerHTML = `
          <dl>
            ${[...breakdown].map(([language, count]) => {
              const proportion = count / lines.length;
              const formatted = d3.format('.1~%')(proportion);
              return `
                <dt>${language}</dt>
                <dd>${count} lines (${formatted})</dd>
              `;
            }).join('')}
          </dl>
        `;
      }
      
    // Raise the dots so they remain interactive above the brush
    svg.selectAll('.dots').raise();
  
    // No calls here, so the page starts with empty info
  }
  
  
  
  

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  createScatter();
  brushSelector();
});
