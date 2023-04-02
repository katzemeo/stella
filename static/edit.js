var META = {
  font: { type: "enum", values: ["Arial", "Times New Roman", "Verdana", "Courier"] },
  object: {
    top: "number",
    left: "number",
    width: "number",
    height: "number",
    scaleX: "number",
    scaleY: "number",
    angle: { type: "number", min: -360, max: 360, step: 5, tooltip: "Rotation Angle in Degrees"},
    fill: { type: "color", caption: "Fill Color" },
    backgroundColor: { type: "color", caption: "BG Color" },
    opacity: { type: "number", style: "range",  min: 0, max: 1, step: 0.01 }
  },
  text: {
    $inherit: "object",
    fontFamily: "font",
    fontSize: { type: "number", style: "option", min: 8, max: 60, step: 1},
    fontStyle: { type: "enum", values: ["normal", "italic"] },
    fontWeight: { type: "enum", values: ["normal", "bold"] },
    text: { type: "text", style: "textarea", rows: 2, cols: 25},
    strokeWidth: "number",
    stroke: { type: "color", caption: "Stroke Color" },
    underline: "boolean",
    linethrough: "boolean"
  },
  image: {
    $inherit: "object",
    src: "data",
    url: { type: "url", caption: "URL", tooltip: "Navigate to Link" }
  },
  triangle: {
    $inherit: "object",
    strokeWidth: "number",
    stroke: { type: "color", caption: "Stroke Color" }
  },
  circle: {
    $inherit: "object",
    strokeWidth: "number",
    stroke: { type: "color", caption: "Stroke Color" }
  },
  group: {
    $inherit: "object"
  },
  rect: {
    $inherit: "object",
    strokeWidth: "number",
    stroke: { type: "color", caption: "Stroke Color" }
  },
  path: {
    $inherit: "object"
  }
}

function toCaptionFromIdentifier(identifier) {
  return expandIdentifier(identifier, ' ', false);
}

function expandIdentifier(identifier, separatorChar, allUppercase) {
  const srcChars = Array.from(identifier);
  const chars = [];
  let j = 0;
  let uppercase;
  for (let i = 0; i < srcChars.length; i++) {
    uppercase = (i == 0 || allUppercase || (i > 0 && srcChars[i-1] === ' '));
    chars[j] = uppercase ? srcChars[i].toUpperCase() : srcChars[i];
    j++;
    if (i > 0 && i < srcChars.length - 1) {
      // Whenever the case switches, insert the separator character.
      if ((srcChars[i] === srcChars[i].toLowerCase()) && (srcChars[i + 1] === srcChars[i + 1].toUpperCase())) {
        chars[j] = separatorChar;
        j++;
      } else if ((srcChars[i] === srcChars[i].toUpperCase()) && (srcChars[i + 1] === srcChars[i + 1].toUpperCase())) {
        if (i < srcChars.length - 2 && srcChars[i + 2].isLowerCase()) {
          chars[j] = separatorChar;
          j++;
        }
      }
    }
  }
  return chars.join("");
}

function handlePropertyChange(name, type) {
  const activeObj = _canvas.getActiveObject();
  if (activeObj) {
    let el = document.getElementById(name);
    console.log(activeObj);
    //console.log(`${name} changed from "${activeObj[name]}" to "${el.value}"!`);
    const delta = {};
    if (type === "number") {
      delta[name] = el.valueAsNumber;
    } else if (type === "boolean") {
      delta[name] = el.checked;
    } else {
      delta[name] = el.value;
    }
    activeObj.set(delta);
    _canvas.requestRenderAll();
  }
}

function createObjectControls(parentEl, object, type=null) {
  const meta = META[type ?? object.type];
  if (meta) {
    let control;
    Object.keys(meta).forEach((name) => {
      const propMeta = meta[name];
      if (name === "$inherit") {
        createObjectControls(parentEl, object, propMeta);
      } else {
        const label = document.createElement("label");
        label.style = "width:125px; float:left;";
        label.title = propMeta.type ? propMeta.type : propMeta;
        label.innerText = (propMeta.caption ? propMeta.caption : toCaptionFromIdentifier(name)) +":";
        control = createControl(name, propMeta, object[name], `handlePropertyChange("${name}", "${propMeta.type ?? propMeta}")`);
        if (propMeta.tooltip) {
          control.title = propMeta.tooltip;
        }
        parentEl.appendChild(label);
        parentEl.appendChild(document.createTextNode("\n"));
        parentEl.appendChild(control);
        parentEl.appendChild(document.createElement("br"));
      }
    });
  }
}

function createControl(name, meta, value, onChange) {
  if (meta === "number") {
    return createNumberControl(name, {}, value, onChange);
  } else if (meta.type === "number") {
    return createNumberControl(name, meta, value, onChange);
  } else if (meta === "boolean") {
    return createBooleanControl(name, meta, value, onChange);
  } else if (meta === "color" || meta.type === "color") {
    return createColorControl(name, meta, value, onChange);
  } else if (meta === "font") {
    return createEnumControl(name, META[meta], value, onChange);
  } else if (meta.type === "enum") {
    return createEnumControl(name, meta, value, onChange)
  } else if (meta.style === "textarea") {
    return createTextAreaControl(name, meta, value, onChange);
  }
  return createTextControl(name, meta, value, onChange);
}

function createBooleanControl(name, meta, value, onChange) {
  const el = document.createElement("input");
  el.id = name;
  el.type = "checkbox";
  el.checked = value;
  el.setAttribute("onchange", onChange);
  return el;
}

function createColorControl(name, meta, value, onChange) {
  const el = document.createElement("input");
  el.id = name;
  el.type = "color";
  if (value) {
    el.value = value;
  }
  el.setAttribute("onchange", onChange);
  return el;
}

function createTextControl(name, meta, value, onChange) {
  const el = document.createElement("input");
  el.id = name;
  el.type = meta.type ?? "text";
  if (value) {
    el.value = value;
  }
  if (meta.pattern) {
    el.pattern = meta.pattern;
  }
  el.setAttribute("onchange", onChange);
  return el;
}

function createTextAreaControl(name, meta, value, onChange) {
  const el = document.createElement("textarea");
  el.id = name;
  if (value) {
    el.value = value;
  }
  if (meta.cols) {
    el.cols = meta.cols;
  }
  if (meta.rows) {
    el.rows = meta.rows;
  }
  el.setAttribute("onchange", onChange);
  return el;
}

function createNumberControl(name, meta, value, onChange) {
  const el = document.createElement("input");
  el.id = name;
  el.type = meta.style === "range" ? "range" : "number";
  if (value !== undefined) {
    el.value = value;
  }
  el.min = meta.min ?? 0;
  if (meta.max !== undefined) {
    el.max = meta.max;
  }
  if (meta.step) {
    el.step = meta.step;
  }
  if (meta.pattern) {
    el.pattern = meta.pattern;
  }
  el.setAttribute("onchange", onChange);
  return el;
}

function createEnumControl(name, meta, value, onChange) {
  const el = createSelect(name, meta, value, onChange);
  return el;
}

function createOption(name, caption, value) {
  const el = document.createElement("option");
  el.value = name;
  el.innerText = caption;
  if (name == value) {
    el.selected = "selected";
  }
  return el;
}

function createSelect(name, meta, value, onChange) {
  const el = document.createElement("select");
  el.id = name;
  meta.values.forEach((v) => {
    el.appendChild(createOption(v, v, value));
  });
  el.setAttribute("onchange", onChange);
  return el;
}