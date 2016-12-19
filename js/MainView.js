var buttonRadius = 20;

//----------------------------------------//
//-- Data types
//----------------------------------------//

/*-- Button --*/

function Button(x, y, color) {
  this.pos = new p5.Vector(x, y);
  this.color = color;
  this.enabled = true;
  this.pressed = false;

  this._lerpBrightnessAmt = 1;
  this._lerpAlphaAmt = 0;
}

Button.prototype.render = function() {
  noStroke();

  if (this.enabled && this.pressed && this._lerpBrightnessAmt > 0.8) {
    this._lerpBrightnessAmt = max(this._lerpBrightnessAmt-0.1, 0.8);
  } else if (!this.enabled || !this.pressed && this._lerpBrightnessAmt < 1) {
    this._lerpBrightnessAmt = min(this._lerpBrightnessAmt+0.1, 1);
  }

  if (this.enabled && this._lerpAlphaAmt < 1) {
    this._lerpAlphaAmt = min(this._lerpAlphaAmt + 0.05, 1);
  } else if (!this.enabled && this._lerpAlphaAmt > 0) {
    this._lerpAlphaAmt = max(this._lerpAlphaAmt - 0.05, 0);
  }

  fill(color(
    hue(this.color),
    saturation(this.color),
    brightness(this.color)*this._lerpBrightnessAmt,
    alpha(this.color)*this._lerpAlphaAmt
  ));
  ellipse(this.pos.x, this.pos.y, 2*buttonRadius);
};

/*-- AddButton --*/

function AddButton(x, y, color, lineColor) {
  this.parent.constructor.call(this, x, y, color);
  this.lineColor = lineColor;
}
AddButton.prototype = new Button;
AddButton.prototype.constructor = AddButton;
AddButton.prototype.parent = Button.prototype;

AddButton.prototype.render = function() {
  this.parent.render.call(this);

  stroke(color(
    hue(this.lineColor),
    saturation(this.lineColor),
    brightness(this.lineColor)*this._lerpBrightnessAmt,
    alpha(this.lineColor)*this._lerpAlphaAmt
  ));
  strokeWeight(1);
  line(
    this.pos.x-buttonRadius+10, this.pos.y,
    this.pos.x+buttonRadius-10, this.pos.y
  );
  line(
    this.pos.x, this.pos.y-buttonRadius+10,
    this.pos.x, this.pos.y+buttonRadius-10
  );
};

/*-- RemoveButton --*/

function RemoveButton(x, y, color, lineColor) {
  this.parent.constructor.call(this, x, y, color);
  this.lineColor = lineColor;
}
RemoveButton.prototype = new Button;
RemoveButton.prototype.constructor = RemoveButton;
RemoveButton.prototype.parent = Button.prototype;

RemoveButton.prototype.render = function() {
  this.parent.render.call(this);

  stroke(color(
    hue(this.lineColor),
    saturation(this.lineColor),
    brightness(this.lineColor)*this._lerpBrightnessAmt,
    alpha(this.lineColor)*this._lerpAlphaAmt
  ));
  line(
    this.pos.x-buttonRadius+10, this.pos.y,
    this.pos.x+buttonRadius-10, this.pos.y
  );
};

/*-- DirectedGraph --*/

function DirectedGraph() {
  this.size = 0;
  this._nodes = [];
};

DirectedGraph.prototype.addNode = function(id) {
  if (this._nodes.filter(function(n){ return n.id == id; }).length != 0) {
    return null;
  }
  const node = {id: id, connections: []};
  this._nodes.push(node);
  this.size++;
  return node;
};
DirectedGraph.prototype.addConnection = function(fromId, toId, propability) {
  var fromNode = null;
  var toNode = null;

  var i = 0;
  while (!fromNode && !toNode) {
    const node = this._nodes[i];
    if (!fromNode && node.id == fromId) {
      fromNode = node;
    }
    if (!toNode  && node.id == toId) {
      toNode = node;
    }
    i++;
    if (i >= this._nodes.length) return null;
  }

  const connection = {node: toNode, probability: probability};
  fromNode.connections.push(connection);
  return connection;
};
DirectedGraph.prototype.removeNode = function(id) {
  var removedNode = null;
  for (var i = 0; i < this._nodes.length; i++) {
    const node = this._nodes[i];
    if (node.id == id) {
      this._nodes.splice(i, 1);
      removedNode = node;
    }
    for (var j = 0; j < node.connections.length; j++) {
      const connectedNode = node.connections[j];
      if (connectedNode.id == id) {
        node.connections.splice(j, 1);
      }
    }
  }
  if (removedNode) {
    this.size--;
  }
  return removedNode;
};
DirectedGraph.prototype.removeConnection = function(fromId, toId) {
  var fromNode = null;

  var i = -1;
  while (!fromNode) {
    const node = this._nodes[++i];
    if (!fromNode && node.id == fromId) {
      fromNode = node;
    }
    if (i+1 >= this._nodes.length) return null;
  }

  for (var j = 0; j < fromNode.connections.length; j++) {
    const toNodeId = fromNode.connections[j].id;
    if (toNodeId == toId) {
      const connection = fromNode.connections[j];
      fromNode.connections.splice(j, 1);
      return connection;
    }
  }

  return null;
};

/*-- NodeView --*/

function NodeView(id, x, y, radius = 25) {
  this.pos = new p5.Vector(x, y);
  this.id = id;
  this.radius = radius;
  this.dragged = false;
  this._dragOffset = null;
}

NodeView.prototype.render = function() {
  if (this.dragged) {
    if (!this._dragOffset) {
      this._dragOffset = p5.Vector.sub(this.pos, initialDragPos);
    }
    this.pos.x = mouseX+this._dragOffset.x;
    this.pos.y = mouseY+this._dragOffset.y;
  } else {
    this._dragOffset = null;
  }

  stroke(0);
  strokeWeight(2);
  fill(100);
  ellipse(this.pos.x, this.pos.y, 2*this.radius);

  fill(0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(this.id, this.pos.x, this.pos.y);
};

/*-- EdgeView --*/

function EdgeView(startNodeView, endNodeView) {
  this.startNodeView = startNodeView;
  this.endNodeView = endNodeView;
  this.startPos = startNodeView.pos;
  this.endPos = endNodeView.pos;
  this.angle = PI/3;
  this.arrowHeadSize = 10;
}

EdgeView.prototype.render = function() {
  if (this.startPos != this.endPos) {
    // Edge arc
    const distanceVector = p5.Vector.sub(this.endPos, this.startPos);
    const distance = distanceVector.mag();
    const radius = distance/2/sin(this.angle/2);

    const a = 2*asin(this.startNodeView.radius/2/radius);
    const b = 2*asin(this.endNodeView.radius/2/radius);

    const radiusVector = distanceVector.copy();
    radiusVector.rotate(-(PI+this.angle)/2).setMag(radius);
    const origin = p5.Vector.sub(this.startPos, radiusVector);

    stroke(0);
    strokeWeight(2);
    noFill();
    arc(origin.x, origin.y, 2*radius, 2*radius, radiusVector.heading()+a,
      radiusVector.heading()+this.angle-b);

    // Edge arrow head
    const c = 2*asin(this.arrowHeadSize/2/radius);
    const newRadiusVector = radiusVector.copy();

    newRadiusVector.rotate(this.angle-b);
    const point1 = p5.Vector.add(origin, newRadiusVector);

    newRadiusVector.rotate(-c);
    newRadiusVector.setMag(newRadiusVector.mag()+this.arrowHeadSize/2);
    const point2 = p5.Vector.add(origin, newRadiusVector);

    newRadiusVector.setMag(newRadiusVector.mag()-this.arrowHeadSize);
    const point3 = p5.Vector.add(origin, newRadiusVector);

    fill(0);
    triangle(point1.x, point1.y, point2.x, point2.y, point3.x, point3.y);
  } else {
  }
}

//----------------------------------------//
//-- Drawing
//----------------------------------------//
var graph;
var nodeViews;
var draggedView;
var initialDragPos;
var addButton, removeButton;
var inc = 25;

function setup() {
  createCanvas(1200, 600);
  colorMode(HSB, 360, 100, 100, 100);

  graph = new DirectedGraph();

  nodeViews = [];
  draggedView = null;

  const lineColor = color(0, 0, 40);
  addButton = new AddButton(
    width-buttonRadius-10,
    buttonRadius+10,
    color(180, 20, 90),
    lineColor
  );
  removeButton = new RemoveButton(
    width-buttonRadius-10,
    addButton.pos.y+2*buttonRadius+30,
    color(0, 20, 90),
    lineColor
  );
  removeButton.enabled = false;
}

function getNextId() {
  var i = nodeViews.length;
  var id = "";
  while (i >= 0) {
    id = String.fromCharCode(65+i%26) + id;
    i = i/26-1;
  }
  return id;
}

function mousePressed() {
  if (!initialDragPos) {
    initialDragPos = new p5.Vector(mouseX, mouseY);
  }

  addButton.pressed = dist(mouseX, mouseY,
    addButton.pos.x, addButton.pos.y) <= buttonRadius;
  removeButton.pressed = dist(mouseX, mouseY,
    removeButton.pos.x, removeButton.pos.y) <= buttonRadius;

  for (nodeView of nodeViews) {
    if (dist(mouseX, mouseY, nodeView.pos.x, nodeView.pos.y)
        <= nodeView.radius) {
      nodeView.dragged = true;
      draggedView = nodeView;
      break;
    }
  }
}

function mouseReleased() {
  initialDragPos = null;

  if (addButton.pressed &&
      dist(mouseX, mouseY, addButton.pos.x, addButton.pos.y) <= buttonRadius) {
    // Add button pressed
    removeButton.enabled = true;

    node = graph.addNode(getNextId());

    const cols = floor((width-buttonRadius-30)/50);
    nodeViews.push(new NodeView(
      node.id,
      inc%(cols*50),
      25+50*floor(inc/(cols*50))
    ));
    inc += 50;
  }

  else if (removeButton.pressed &&
      dist(mouseX, mouseY, removeButton.pos.x, removeButton.pos.y)
        <= buttonRadius) {
    // Remove button pressed
    graph.removeNode(nodeViews.pop().id);
    inc -= 50;
    if (graph.size <= 0) {
      removeButton.enabled = false;
    }
  }

  addButton.pressed = removeButton.pressed = false;

  if (draggedView) {
    draggedView.dragged = false;
    draggedView = null;
  }

}

function draw() {
  background(100);

  addButton.render();
  removeButton.render();

  var prevNodeView = null;
  for (nodeView of nodeViews) {
    if (prevNodeView) {
      (new EdgeView(prevNodeView, nodeView)).render();
    }
    nodeView.render();
    prevNodeView = nodeView;
  }

  for (nodeView of nodeViews) {
    nodeView.render();
  }
}
