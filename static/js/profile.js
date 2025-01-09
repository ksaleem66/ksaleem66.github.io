async function fetchUserProfile() {
    const query = `
    {
        user {
            id
            login
            attrs
            auditRatio
            createdAt
        }
        transaction(where:{ _and:[{type: {_eq: "xp"}},
          {object:{parents:{parent:{name:{_eq:"Module"}}}}},
          ]}) {
               id
               amount
               createdAt
               path
        }
        progress(where: {
            _and: [
                {isDone: {_eq: true}},
                {grade: {_neq: 0}} #{grade: {_is_null: false}}
            ]
        }) {
            id
            grade
            createdAt
            path
            objectId
        }
        results: result(where: {
            _and: [
                {grade: {_is_null: false}},
                {isLast: {_eq: true}}
            ]
        }) {
            id
            grade
            createdAt
            path
            objectId
        }
        test: transaction(where: {_or: [{type: {_eq: "up"}}, {type: {_eq: "down"}}]}) {
            id
            type
            amount
        }
        down_transactions: transaction(
            distinct_on: [path]
            where: {type: {_eq: "down"}}
        ) {
            id
            type
            amount
            object:
            objectId
            path
        }
        up_transactions: transaction(
            where: {type: {_eq: "up"}}
        ) {
            id
            type
            amount
            object:
            objectId
            path
        }
    }
`;

    try {
        const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('jwt')
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();
        displayUserData(result);
    } catch (error) {
        console.error('Error fetching profile data:', error);
    }
}

function displayUserData(result) {
    const user = result.data.user[0];
    const transactions = result.data.transaction;
    const progress = result.data.progress;

    const auditDone = result.data.up_transactions.length;
    const auditReceived = result.data.down_transactions.length;
    console.log("Raw Data:", transactions)
    // Update user info
    document.getElementById('user-info').innerHTML = `
        <h2>Welcome, ${user.attrs.firstName} ${user.attrs.lastName} (${user.login})!</h2>
        <p>Member since: ${new Date(user.createdAt).toDateString()}</p>
    `;

    // Calculate total XP
    const totalXP = transactions.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('xp-total').textContent = totalXP.toLocaleString();

    // Calculate grades
    const grades = progress.filter(p => p.grade != null);
    const avgGrade = grades.reduce((sum, p) => sum + p.grade, 0);
    document.getElementById('avg-grade').textContent = avgGrade.toFixed(2);

    // Projects completed
    //document.getElementById('projects-completed').textContent = progress.length;

    // Audit Done/Received
    document.getElementById('audit-done').textContent = auditDone + "/" + auditReceived;

    // Audit Ratio
    //const auditR = Math.round(user.auditRatio).toFixed(1);
    const auditR = Math.round(user.auditRatio);
    //document.getElementById('audit-ratio').textContent = Math.round(user.auditRatio).toFixed(1);
    document.getElementById('audit-ratio').textContent = (user.auditRatio).toFixed(1);
    //auditMsg = ""
    // if (auditR <= 1) {
    //     auditMsg = "You can do better!"
    // }
    // document.getElementById('audit-ratio').textContent = auditR + " " + auditMsg;
   

    // Create graphs
    createXPGraph(transactions);
    createProjectGraph(transactions);
    createAuditRatioGraph(auditDone, auditReceived);

}

function createXPGraph(transactions) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const graphContainer = document.querySelector('.graphs-container div:first-child');
    graphContainer.innerHTML = '';
    
    const margin = { top: 40, right: 40, bottom: 60, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    svg.setAttribute('width', width + margin.left + margin.right);
    svg.setAttribute('height', height + margin.top + margin.bottom);
    
    const sortedTransactions = transactions.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
    );

    let cumulativeXP = 0;
    const dataPoints = sortedTransactions.map(t => {
        cumulativeXP += t.amount;
        return {
            date: new Date(t.createdAt),
            xp: cumulativeXP
        };
    });

    const maxXP = Math.max(...dataPoints.map(d => d.xp));

    // Modified scales
    const xScale = (xp) => {
        return (xp / maxXP) * width;
    };

    const yScale = (date) => {
        const timeRange = dataPoints[dataPoints.length - 1].date - dataPoints[0].date;
        return height - (((date - dataPoints[0].date) / timeRange) * height);
    };

    // Create line path
    const line = dataPoints.map((p, i) => 
        (i === 0 ? 'M' : 'L') + `${xScale(p.xp)},${yScale(p.date)}`
    ).join(' ');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', line);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2196F3');
    path.setAttribute('stroke-width', '2');


    const yAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxisLine.setAttribute('x1', 0);
    yAxisLine.setAttribute('y1', 0);
    yAxisLine.setAttribute('x2', 0);
    yAxisLine.setAttribute('y2', height);
    yAxisLine.setAttribute('stroke', 'black');

    const xAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    // xAxisLine.setAttribute('x1', 0);
    // xAxisLine.setAttribute('y1', 0);
    // xAxisLine.setAttribute('x2', width);
    // xAxisLine.setAttribute('y2', 0);
    // xAxisLine.setAttribute('stroke', 'black');
    xAxisLine.setAttribute('x1', 0);
    xAxisLine.setAttribute('y1', height);
    xAxisLine.setAttribute('x2', width);
    xAxisLine.setAttribute('y2', height);
    xAxisLine.setAttribute('stroke', 'black');

    // Create axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxis.setAttribute('transform', `translate(0,${height})`); // Move x-axis to bottom

    // Add ticks and labels
    const xTicks = 5;
    const yTicks = 8;

    // X-axis (XP) ticks
    for (let i = 0; i <= xTicks; i++) {
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x = (width * i) / xTicks;
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', 0);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', 6);
        tick.setAttribute('stroke', 'black');
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const xpValue = Math.round((maxXP * i) / xTicks);
        label.textContent = xpValue.toLocaleString();
        label.setAttribute('x', x);
        label.setAttribute('y', 20);
        label.setAttribute('text-anchor', 'middle');
        xAxis.appendChild(tick);
        xAxis.appendChild(label);
    }

    // Y-axis (dates) ticks
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const startDate = dataPoints[0].date;
    const endDate = dataPoints[dataPoints.length - 1].date;
    const dateRange = endDate.getTime() - startDate.getTime();

    for (let i = 0; i <= yTicks; i++) {
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const y = (height * i) / yTicks;
        tick.setAttribute('x1', -6);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', 0);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', 'black');
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const date = new Date(endDate.getTime() - (dateRange * i / yTicks));
        label.textContent = date.toLocaleDateString();
        label.setAttribute('x', -10);
        label.setAttribute('y', y);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('dominant-baseline', 'middle');
        yAxis.appendChild(tick);
        yAxis.appendChild(label);
    }

    // Axis labels
    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.textContent = 'XP Points';
    xLabel.setAttribute('x', width / 2);
    xLabel.setAttribute('y', height + 40);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('font-weight', 'bold');

    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.textContent = 'Date';
    yLabel.setAttribute('transform', `rotate(-90) translate(${-height/2}, ${-margin.left/2})`);
    yLabel.setAttribute('text-anchor', 'middle');
    yLabel.setAttribute('font-weight', 'bold');

    // Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.textContent = 'XP Progress Over Time';
    title.setAttribute('x', width / 2);
    title.setAttribute('y', -10);
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-weight', 'bold');

    // Append all elements
    g.appendChild(xAxisLine);
    g.appendChild(yAxisLine);
    g.appendChild(xAxis);
    g.appendChild(yAxis);
    g.appendChild(path);
    g.appendChild(title);
    g.appendChild(xLabel);
    g.appendChild(yLabel);
    svg.appendChild(g);
    
    graphContainer.appendChild(svg);
}

function createProjectGraph(transactions) {
    // Process and aggregate data
    const projectData = transactions.reduce((acc, t) => {
        const projectName = t.path.replace('/bahrain/bh-module/', '');
        acc[projectName] = (acc[projectName] || 0) + t.amount;
        return acc;
    }, {});
    // Convert to array and sort by XP
    const projects = Object.entries(projectData)
        .map(([name, xp]) => ({ name, xp }))
        .filter(p => p.xp > 0)  // Filter out zero XP projects
        .sort((a, b) => b.xp - a.xp)
        //.slice(0, 10);  // Show top 10 projects
    // SVG setup
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    svg.setAttribute('width', width + margin.left + margin.right);
    svg.setAttribute('height', height + margin.top + margin.bottom);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const barWidth = (width / projects.length) * 0.8;
    const barPadding = (width / projects.length) * 0.2;
    const maxXP = Math.max(...projects.map(p => p.xp));

    // Create bars
    projects.forEach((project, i) => {
        const barHeight = (project.xp / maxXP) * height;
        const x = i * (barWidth + barPadding);
        const y = height - barHeight;

        // Create bar
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bar.setAttribute('x', x);
        bar.setAttribute('y', y);
        bar.setAttribute('width', barWidth);
        bar.setAttribute('height', barHeight);
        bar.setAttribute('fill', '#2196F3');

        // Project name label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.textContent = project.name;
        label.setAttribute('x', x + barWidth / 2);
        label.setAttribute('y', height + 20);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('transform', `rotate(45, ${x + barWidth / 2}, ${height + 20})`);
        label.setAttribute('font-size', '12px');

        // XP value label
        const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        value.textContent = Math.round(project.xp).toLocaleString();
        value.setAttribute('x', x + barWidth / 2);
        value.setAttribute('y', y - 5);
        value.setAttribute('text-anchor', 'middle');
        value.setAttribute('font-size', '12px');

        g.appendChild(bar);
        g.appendChild(label);
        g.appendChild(value);
    });

    // // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', 0);
    xAxis.setAttribute('y1', height);
    xAxis.setAttribute('x2', width);
    xAxis.setAttribute('y2', height);
    xAxis.setAttribute('stroke', 'black');

    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', 0);
    yAxis.setAttribute('y1', 0);
    yAxis.setAttribute('x2', 0);
    yAxis.setAttribute('y2', height);
    yAxis.setAttribute('stroke', 'black');

    // Y-axis ticks and labels
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const y = height - (height * i / yTicks);
        const tickValue = Math.round((maxXP * i / yTicks));

        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', -5);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', 0);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', 'black');

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.textContent = tickValue.toLocaleString();
        label.setAttribute('x', -10);
        label.setAttribute('y', y);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('alignment-baseline', 'middle');
        label.setAttribute('font-size', '12px');

        g.appendChild(tick);
        g.appendChild(label);
    }

    // Y-axis label
    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.textContent = 'XP Earned';
    yLabel.setAttribute('transform', `rotate(-90) translate(${-height/2}, ${-margin.left/2})`);
    yLabel.setAttribute('text-anchor', 'middle');
    yLabel.setAttribute('font-size', '14px');

    // Add title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.textContent = 'XP By Project';
    title.setAttribute('x', width / 2);
    title.setAttribute('y', -10);
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '16px');
    title.setAttribute('font-weight', 'bold');

    // Append elements
    g.appendChild(xAxis);
    g.appendChild(yAxis);
    g.appendChild(yLabel);
    g.appendChild(title);
    svg.appendChild(g);

    // Add to container
    const graphContainer = document.querySelector('.graphs-container div:nth-child(2)');
    graphContainer.innerHTML = '';
    graphContainer.appendChild(svg);
}

function createAuditRatioGraph(auditDone, auditReceived) {
    const svgWidth = 300;
    const svgHeight = 200;
    const radius = Math.min(svgWidth, svgHeight) / 3;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    
    // Calculate total and angles
    const total = auditDone + auditReceived;
    const doneAngle = (auditDone / total) * 360;
    const receivedAngle = (auditReceived / total) * 360;
    
    // Create SVG content
    const svg = document.getElementById('audit-graph');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.innerHTML = '';
    
    // Helper function to create pie slice path
    function createSlicePath(startAngle, endAngle) {
        const start = polarToCartesian(centerX, centerY, radius, startAngle);
        const end = polarToCartesian(centerX, centerY, radius, endAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
        
        return [
            'M', centerX, centerY,
            'L', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
            'Z'
        ].join(' ');
    }
    
    // Helper function to convert polar coordinates to cartesian
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    
    // Create pie slices
    const donePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    donePath.setAttribute('d', createSlicePath(0, doneAngle));
    donePath.setAttribute('fill', '#4CAF50');
    
    const receivedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    receivedPath.setAttribute('d', createSlicePath(doneAngle, 360));
    receivedPath.setAttribute('fill', '#2196F3');
    
    // Create legend
    const legendY1 = svgHeight - 40;
    const legendY2 = svgHeight - 20;
    
    // Done legend
    const doneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    doneRect.setAttribute('x', 20);
    doneRect.setAttribute('y', legendY1);
    doneRect.setAttribute('width', 15);
    doneRect.setAttribute('height', 15);
    doneRect.setAttribute('fill', '#4CAF50');
    
    const doneText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    doneText.setAttribute('x', 45);
    doneText.setAttribute('y', legendY1 + 12);
    doneText.textContent = `Done (${auditDone})`;
    
    // Received legend
    const receivedRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    receivedRect.setAttribute('x', 20);
    receivedRect.setAttribute('y', legendY2);
    receivedRect.setAttribute('width', 15);
    receivedRect.setAttribute('height', 15);
    receivedRect.setAttribute('fill', '#2196F3');
    
    const receivedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    receivedText.setAttribute('x', 45);
    receivedText.setAttribute('y', legendY2 + 12);
    receivedText.textContent = `Received (${auditReceived})`;
    
    // Add percentage labels in the pie slices
    const donePercent = Math.round((auditDone / total) * 100);
    const receivedPercent = Math.round((auditReceived / total) * 100);
    
    // Done percentage
    const donePercentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const doneAngleForLabel = doneAngle / 2;
    const doneLabelPos = polarToCartesian(centerX, centerY, radius / 1.5, doneAngleForLabel);
    donePercentText.setAttribute('x', doneLabelPos.x);
    donePercentText.setAttribute('y', doneLabelPos.y);
    donePercentText.setAttribute('text-anchor', 'middle');
    donePercentText.setAttribute('fill', 'white');
    donePercentText.textContent = `${donePercent}%`;
    
    // Received percentage
    const receivedPercentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const receivedAngleForLabel = doneAngle + (receivedAngle / 2);
    const receivedLabelPos = polarToCartesian(centerX, centerY, radius / 1.5, receivedAngleForLabel);
    receivedPercentText.setAttribute('x', receivedLabelPos.x);
    receivedPercentText.setAttribute('y', receivedLabelPos.y);
    receivedPercentText.setAttribute('text-anchor', 'middle');
    receivedPercentText.setAttribute('fill', 'white');
    receivedPercentText.textContent = `${receivedPercent}%`;
    
    // Add all elements to SVG
    svg.appendChild(donePath);
    svg.appendChild(receivedPath);
    svg.appendChild(doneRect);
    svg.appendChild(doneText);
    svg.appendChild(receivedRect);
    svg.appendChild(receivedText);
    svg.appendChild(donePercentText);
    svg.appendChild(receivedPercentText);
}

// Initialize the page
fetchUserProfile();

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('jwt');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Call checkAuth when page loads
checkAuth();

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    // Clear JWT token from localStorage
    localStorage.removeItem('jwt');
    
    // Clear any other stored data if exists
    localStorage.clear();
    
    // Clear cookies if any
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    // Redirect to login page
    window.location.href = 'login.html';
});

// Prevent navigating back to the login page
window.onpopstate = function (event) {
    // Redirect to profile.html if the user tries to go back
    window.location.href = 'profile.html';
};