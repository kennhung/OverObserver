/*
 * Copyright 2015 brutusin.org
 *
 * Licensed under the Apache License, Version 2.0 (the "SuperLicense");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Ignacio del Valle Alles idelvall@brutusin.org
 */

if (typeof brutusin === "undefined") {
    window.brutusin = new Object();
} else if (typeof brutusin !== "object") {
    throw ("brutusin global variable already exists");
}

(function () {
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            position = position || 0;
            return this.indexOf(searchString, position) === position;
        };
    }
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function (searchString, position) {
            var subjectString = this.toString();
            if (position === undefined || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        };
    }
    if (!String.prototype.includes) {
        String.prototype.includes = function () {
            'use strict';
            return String.prototype.indexOf.apply(this, arguments) !== -1;
        };
    }
    if (!String.prototype.format) {
        String.prototype.format = function () {
            var formatted = this;
            for (var i = 0; i < arguments.length; i++) {
                var regexp = new RegExp('\\{' + i + '\\}', 'gi');
                formatted = formatted.replace(regexp, arguments[i]);
            }
            return formatted;
        };
    }

    var ScoutForms = new Object();
    ScoutForms.messages = {
        "validationError": "Validation error",
        "required": "This field is **required**",
        "invalidValue": "Invalid field value",
        "addpropNameExistent": "This property is already present in the object",
        "addpropNameRequired": "A name is required",
        "minItems": "At least `{0}` items are required",
        "maxItems": "At most `{0}` items are allowed",
        "pattern": "Value does not match pattern: `{0}`",
        "minLength": "Value must be **at least** `{0}` characters long",
        "maxLength": "Value must be **at most** `{0}` characters long",
        "multipleOf": "Value must be **multiple of** `{0}`",
        "minimum": "Value must be **greater or equal than** `{0}`",
        "exclusiveMinimum": "Value must be **greater than** `{0}`",
        "maximum": "Value must be **lower or equal than** `{0}`",
        "exclusiveMaximum": "Value must be **lower than** `{0}`",
        "minProperties": "At least `{0}` properties are required",
        "maxProperties": "At most `{0}` properties are allowed",
        "uniqueItems": "Array items must be unique",
        "addItem": "Add item",
        "true": "True",
        "false": "False"
    };

    /**
     * Callback functions to be notified after an HTML element has been rendered (passed as parameter).
     * @type type
     */
    ScoutForms.decorators = new Array();

    ScoutForms.addDecorator = function (f) {
        ScoutForms.decorators[ScoutForms.decorators.length] = f;
    };

    ScoutForms.onResolutionStarted = function (element) {
    };

    ScoutForms.onResolutionFinished = function (element) {
    };

    ScoutForms.onValidationError = function (element, message) {
        element.focus();
        if (!element.className.includes(" error")) {
            element.className += " error";
        }
        alert(message);
    };

    ScoutForms.onValidationSuccess = function (element) {
        element.className = element.className.replace(" error", "");
    };

    /**
     * Callback function to be notified after a form has been rendered (passed as parameter).
     * @type type
     */
    ScoutForms.postRender = null;
    /**
     * BrutusinForms instances created in the document
     * @type Array
     */
    ScoutForms.instances = new Array();
    /**
     * BrutusinForms factory method
     * @param {type} schema schema object
     * @returns {ScoutForms.create.obj|Object|Object.create.obj}
     */
    ScoutForms.create = function (schema) {
        var SCHEMA_ANY = {"type": "any"};
        var obj = new Object();

        var schemaMap = new Object();
        var dependencyMap = new Object();
        var renderInfoMap = new Object();
        var container;
        var data;
        var error;
        var initialValue;
        var inputCounter = 0;
        var root = schema;
        var formId = "BrutusinForms#" + ScoutForms.instances.length;

        renameRequiredPropeties(schema); // required v4 (array) -> requiredProperties
        populateSchemaMap("$", schema);

        validateDepencyMapIsAcyclic();

        var renderers = new Object();

        renderers["integer"] = function (container, id, parentObject, propertyProvider, value) {
            renderers["string"](container, id, parentObject, propertyProvider, value);
        };

        renderers["number"] = function (container, id, parentObject, propertyProvider, value) {
            renderers["string"](container, id, parentObject, propertyProvider, value);
        };

        renderers["any"] = function (container, id, parentObject, propertyProvider, value) {
            renderers["string"](container, id, parentObject, propertyProvider, value);
        };

        renderers["string"] = function (container, id, parentObject, propertyProvider, value) {
            /// specifier so it becomes a file element.
            var schemaId = getSchemaId(id);
            var parentId = getParentSchemaId(schemaId);
            var s = getSchema(schemaId);
            var parentSchema = getSchema(parentId);
            var input;
            if (s.type === "any") {
                input = document.createElement("textarea");
                if (value) {
                    input.value = JSON.stringify(value, null, 4);
                    if (s.readOnly)
                        input.disabled = true;
                }
            } else if (s.enum) {
                input = document.createElement("select");
                if (!s.required) {
                    var option = document.createElement("option");
                    var textNode = document.createTextNode("");
                    option.value = "";
                    appendChild(option, textNode, s);
                    appendChild(input, option, s);
                }
                var selectedIndex = 0;
                for (var i = 0; i < s.enum.length; i++) {
                    var option = document.createElement("option");
                    var textNode = document.createTextNode(s.enum[i]);
                    option.value = s.enum[i];
                    appendChild(option, textNode, s);
                    appendChild(input, option, s);
                    if (value && s.enum[i] === value) {
                        selectedIndex = i;
                        if (!s.required) {
                            selectedIndex++;
                        }
                        if (s.readOnly)
                            input.disabled = true;
                    }
                }
                if (s.enum.length === 1)
                    input.selectedIndex = 0;
                else
                    input.selectedIndex = selectedIndex;
            } else {
                input = document.createElement("input");
                if (s.type === "integer" || s.type === "number") {
                    input.step = s.step ? "" + s.step : "any";
                    input.classList.add("text-center");
                    if (typeof value !== "number") {
                        value = null;
                    }
                    if (s.type === "integer") {
                       input.classList.add("integer-input");
                    }
                } else if (s.format === "date-time") {
                    try {
                        input.type = "datetime-local";
                    } catch (err) {
                        input.type = "text";
                    }
                } else if (s.format === "date") {
                    input.type = "date";
                } else if (s.format === "time") {
                    input.type = "time";
                } else if (s.format === "email") {
                    input.type = "email";
                } else if (s.format === "text") {
                    input = document.createElement("textarea");
                } else {
                    input.type = "text";
                }
                if (value !== null && typeof value !== "undefined") {
                    // readOnly?
                    input.value = value;
                    if (s.readOnly)
                        input.disabled = true;

                }
            }
            input.schema = schemaId;
            input.setAttribute("autocorrect", "off");

            input.getValidationError = function () {
                try {
                    var value = getValue(s, input);
                    if (value === null) {
                        if (s.required) {
                            if (parentSchema && parentSchema.type === "object") {
                                if (parentSchema.required) {
                                    return ScoutForms.messages["required"];
                                } else {
                                    for (var prop in parentObject) {
                                        if (parentObject[prop] !== null) {
                                            return ScoutForms.messages["required"];
                                        }
                                    }
                                }
                            } else {
                                return ScoutForms.messages["required"];
                            }
                        }
                    } else {
                        if (s.pattern && !s.pattern.test(value)) {
                            return ScoutForms.messages["pattern"].format(s.pattern.source);
                        }
                        if (s.minLength) {
                            if (!value || s.minLength > value.length) {
                                return ScoutForms.messages["minLength"].format(s.minLength);
                            }
                        }
                        if (s.maxLength) {
                            if (value && s.maxLength < value.length) {
                                return ScoutForms.messages["maxLength"].format(s.maxLength);
                            }
                        }
                    }
                    if (value !== null && !isNaN(value)) {
                        if (s.multipleOf && value % s.multipleOf !== 0) {
                            return ScoutForms.messages["multipleOf"].format(s.multipleOf);
                        }
                        if (s.hasOwnProperty("maximum")) {
                            if (s.exclusiveMaximum && value >= s.maximum) {
                                return ScoutForms.messages["exclusiveMaximum"].format(s.maximum);
                            } else if (!s.exclusiveMaximum && value > s.maximum) {
                                return ScoutForms.messages["maximum"].format(s.maximum);
                            }
                        }
                        if (s.hasOwnProperty("minimum")) {
                            if (s.exclusiveMinimum && value <= s.minimum) {
                                return ScoutForms.messages["exclusiveMinimum"].format(s.minimum);
                            } else if (!s.exclusiveMinimum && value < s.minimum) {
                                return ScoutForms.messages["minimum"].format(s.minimum);
                            }
                        }
                    }
                } catch (error) {
                    return ScoutForms.messages["invalidValue"];
                }
            };

            input.onchange = function () {
                var value;
                try {
                    value = getValue(s, input);
                } catch (error) {
                    value = null;
                }
                if (parentObject) {
                    parentObject[propertyProvider.getValue()] = value;
                } else {
                    data = value;
                }
                onDependencyChanged(schemaId, input);
            };

            if (s.description) {
                input.title = s.description;
                input.placeholder = s.description;
            }
//        if (s.pattern) {
//            input.pattern = s.pattern;
//        }
//        if (s.required) {
//            input.required = true;
//        }
//
//        if (s.minimum) {
//            input.min = s.minimum;
//        }
//        if (s.maximum) {
//            input.max = s.maximum;
//        }
            input.onchange();
            input.id = getInputId();
            inputCounter++;
            appendChild(container, input, s);
            return parentObject;
        };

        renderers["boolean"] = function (container, id, parentObject, propertyProvider, value) {
            var schemaId = getSchemaId(id);
            var s = getSchema(schemaId);
            var input;
            if (s.required) {
                input = document.createElement("input");
                input.type = "checkbox";
                if (value === true || value !== false && s.default) {
                    input.checked = true;
                }
            } else {
                input = document.createElement("select");
                var emptyOption = document.createElement("option");
                var textEmpty = document.createTextNode("");
                textEmpty.value = "";
                appendChild(emptyOption, textEmpty, s);
                appendChild(input, emptyOption, s);

                var optionTrue = document.createElement("option");
                var textTrue = document.createTextNode(ScoutForms.messages["true"]);
                optionTrue.value = "true";
                appendChild(optionTrue, textTrue, s);
                appendChild(input, optionTrue, s);

                var optionFalse = document.createElement("option");
                var textFalse = document.createTextNode(ScoutForms.messages["false"]);
                optionFalse.value = "false";
                appendChild(optionFalse, textFalse, s);
                appendChild(input, optionFalse, s);

                if (value === true) {
                    input.selectedIndex = 1;
                } else if (value === false) {
                    input.selectedIndex = 2;
                }
            }
            input.onchange = function () {
                if (parentObject) {
                    parentObject[propertyProvider.getValue()] = getValue(s, input);
                } else {
                    data = getValue(s, input);
                }
                onDependencyChanged(schemaId, input);
            };
            input.schema = schemaId;
            input.id = getInputId();
            inputCounter++;
            if (s.description) {
                input.title = s.description;
            }
            input.onchange();
            appendChild(container, input, s);
        };

        renderers["object"] = function (container, id, parentObject, propertyProvider, value) {

            function createStaticPropertyProvider(propname) {
                var ret = new Object();
                ret.getValue = function () {
                    return propname;
                };
                ret.onchange = function (oldName) {
                };
                return ret;
            }

            function addAdditionalProperty(current, table, id, name, value, pattern) {
                var schemaId = getSchemaId(id);
                var s = getSchema(schemaId);
                var tbody = table.tBodies[0];
                var tr = document.createElement("tr");
                var td1 = document.createElement("td");
                td1.className = "add-prop-name";
                var innerTab = document.createElement("table");
                var innerTr = document.createElement("tr");
                var innerTd1 = document.createElement("td");
                var innerTd2 = document.createElement("td");
                var keyForBlank = "$" + Object.keys(current).length + "$";
                var td2 = document.createElement("td");
                td2.className = "prop-value";
                var nameInput = document.createElement("input");
                nameInput.type = "text";
                var regExp;
                if (pattern) {
                    regExp = RegExp(pattern);
                }
                nameInput.getValidationError = function () {
                    if (nameInput.previousValue !== nameInput.value) {
                        if (current.hasOwnProperty(nameInput.value)) {
                            return ScoutForms.messages["addpropNameExistent"];
                        }
                    }
                    if (!nameInput.value) {
                        return ScoutForms.messages["addpropNameRequired"];
                    }
                };
                var pp = createPropertyProvider(
                    function () {
                        if (nameInput.value) {
                            if (regExp) {
                                if (nameInput.value.search(regExp) !== -1) {
                                    return nameInput.value;
                                }
                            } else {
                                return nameInput.value;
                            }
                        }
                        return keyForBlank;
                    },
                    function (oldPropertyName) {
                        if (pp.getValue() === oldPropertyName) {
                            return;
                        }
                        if (!oldPropertyName || !current.hasOwnProperty(oldPropertyName)) {
                            oldPropertyName = keyForBlank;
                        }
                        if (current.hasOwnProperty(oldPropertyName) || regExp && pp.getValue().search(regExp) === -1) {
                            current[pp.getValue()] = current[oldPropertyName];
                            delete current[oldPropertyName];
                        }
                    });

                nameInput.onblur = function () {
                    if (nameInput.previousValue !== nameInput.value) {
                        var name = nameInput.value;
                        var i = 1;
                        while (nameInput.previousValue !== name && current.hasOwnProperty(name)) {
                            name = nameInput.value + "(" + i + ")";
                            i++;
                        }
                        nameInput.value = name;
                        pp.onchange(nameInput.previousValue);
                        nameInput.previousValue = nameInput.value;
                        return;
                    }
                };
                var removeButton = document.createElement("button");
                removeButton.setAttribute('type', 'button');
                removeButton.className = "remove";
                appendChild(removeButton, document.createTextNode("x"), s);
                removeButton.onclick = function () {
                    delete current[nameInput.value];
                    table.deleteRow(tr.rowIndex);
                    nameInput.value = null;
                    pp.onchange(nameInput.previousValue);
                };
                appendChild(innerTd1, nameInput, s);
                appendChild(innerTd2, removeButton, s);
                appendChild(innerTr, innerTd1, s);
                appendChild(innerTr, innerTd2, s);
                appendChild(innerTab, innerTr, s);
                appendChild(td1, innerTab, s);

                if (pattern !== undefined) {
                    nameInput.placeholder = pattern;
                }

                appendChild(tr, td1, s);
                appendChild(tr, td2, s);
                appendChild(tbody, tr, s);
                appendChild(table, tbody, s);
                render(null, td2, id, current, pp, value);

                if (name) {
                    nameInput.value = name;
                    nameInput.onblur();
                }
            }

            var schemaId = getSchemaId(id);
            var s = getSchema(schemaId);
            var current = new Object();
            if (!parentObject) {
                data = current;
            } else {
                if (propertyProvider.getValue() || propertyProvider.getValue() === 0) {
                    parentObject[propertyProvider.getValue()] = current;
                }
            }
            var outContainer = document.createElement("div");
            var propNum = 0;
            if (s.hasOwnProperty("properties")) {
                propNum = s.properties.length;
                for (var prop in s.properties) {
                    var row = document.createElement("div");
                    row.className = "row form-group";
                    var colTitle = document.createElement("div");
                    colTitle.className = "col-6 prop-title";
                    var propId = id + "." + prop;
                    var propSchema = getSchema(getSchemaId(propId));
                    var colValue = document.createElement("div");
                    colValue.className = "col-6 prop-value";

                    appendChild(outContainer, row, propSchema);
                    appendChild(row, colTitle, propSchema);
                    appendChild(row, colValue, propSchema);
                    var pp = createStaticPropertyProvider(prop);
                    var propInitialValue = null;
                    if (value) {
                        propInitialValue = value[prop];
                    }
                    render(colTitle, colValue, propId, current, pp, propInitialValue);
                }
            }
            var usedProps = [];
            if (s.patternProperties || s.additionalProperties) {
                var div = document.createElement("div");
                appendChild(div, outContainer, s);
                if (s.patternProperties) {
                    for (var pattern in s.patternProperties) {
                        var patProps = s.patternProperties[pattern];
                        var patdiv = document.createElement("div");
                        patdiv.className = "add-pattern-div";
                        var addButton = document.createElement("button");
                        addButton.setAttribute('type', 'button');
                        addButton.pattern = pattern;
                        addButton.id = id + "[" + pattern + "]";
                        addButton.onclick = function () {
                            addAdditionalProperty(current, outContainer, this.id, undefined, undefined, this.pattern);
                        };
                        if (s.maxProperties || s.minProperties) {
                            addButton.getValidationError = function () {
                                if (s.minProperties && propNum + outContainer.rows.length < s.minProperties) {
                                    return ScoutForms.messages["minProperties"].format(s.minProperties);
                                }
                                if (s.maxProperties && propNum + outContainer.rows.length > s.maxProperties) {
                                    return ScoutForms.messages["maxProperties"].format(s.maxProperties);
                                }
                            };
                        }
                        if (patProps.description) {
                            addButton.title = patProps.description;
                        }
                        appendChild(addButton, document.createTextNode("Add " + pattern), s);
                        appendChild(patdiv, addButton, s);
                        if (value) {
                            for (var p in value) {
                                if (s.properties && s.properties.hasOwnProperty(p)) {
                                    continue;
                                }
                                var r = RegExp(pattern);
                                if (p.search(r) === -1) {
                                    continue;
                                }
                                if (usedProps.indexOf(p) !== -1) {
                                    continue;
                                }
                                addAdditionalProperty(current, outContainer, id + "[" + pattern + "]", p, value[p], pattern);
                                usedProps.push(p);
                            }
                        }
                        appendChild(div, patdiv, s);
                    }
                }
                if (s.additionalProperties) {
                    var addPropS = getSchema(s.additionalProperties);
                    var addButton = document.createElement("button");
                    addButton.setAttribute('type', 'button');
                    addButton.onclick = function () {
                        addAdditionalProperty(current, outContainer, id + "[*]", undefined);
                    };
                    if (s.maxProperties || s.minProperties) {
                        addButton.getValidationError = function () {
                            if (s.minProperties && propNum + outContainer.rows.length < s.minProperties) {
                                return ScoutForms.messages["minProperties"].format(s.minProperties);
                            }
                            if (s.maxProperties && propNum + outContainer.rows.length > s.maxProperties) {
                                return ScoutForms.messages["maxProperties"].format(s.maxProperties);
                            }
                        };
                    }
                    if (addPropS.description) {
                        addButton.title = addPropS.description;
                    }
                    appendChild(addButton, document.createTextNode("Add"), s);
                    appendChild(div, addButton, s);
                    if (value) {
                        for (var p in value) {
                            if (s.properties && s.properties.hasOwnProperty(p)) {
                                continue;
                            }
                            if (usedProps.indexOf(p) !== -1) {
                                continue;
                            }
                            addAdditionalProperty(current, outContainer, id + "[\"" + prop + "\"]", p, value[p]);
                        }
                    }
                }
                appendChild(container, div, s);
            } else {
                appendChild(container, outContainer, s);
            }
        };
        // end of object renderer
        /**
         * Renders the form inside the the container, with the specified data preloaded
         * @param {type} c container
         * @param {type} data json data
         * @returns {undefined}
         */
        obj.render = function (c, data) {
            container = c;
            initialValue = data;
            var form = document.createElement("div");
            form.className = "brutusin-form";
            form.onsubmit = function (event) {
                return false;
            };
            if (container) {
                appendChild(container, form);
            } else {
                appendChild(document.body, form);
            }
            if (error) {
                var errLabel = document.createElement("label");
                var errNode = document.createTextNode(error);
                appendChild(errLabel, errNode);
                errLabel.className = "error-message";
                appendChild(form, errLabel);
            } else {
                render(null, form, "$", null, null);
            }
            if (dependencyMap.hasOwnProperty("$")) {
                onDependencyChanged("$");
            }
            if (ScoutForms.postRender) {
                ScoutForms.postRender(obj);
            }
        };

        obj.getRenderingContainer = function () {
            return container;
        };

        obj.validate = function () {
            return validate(container);
        };

        obj.getData = function () {
            function removeEmptiesAndNulls(object, s) {
                if (s === null) {
                    s = SCHEMA_ANY;
                }
                if (s.$ref) {
                    s = getDefinition(s.$ref);
                }
                if (object instanceof Array) {
                    if (object.length === 0) {
                        return null;
                    }
                    var clone = new Array();
                    for (var i = 0; i < object.length; i++) {
                        clone[i] = removeEmptiesAndNulls(object[i], s.items);
                    }
                    return clone;
                } else if (object === "") {
                    return null;
                } else if (object instanceof Object) {
                    var clone = new Object();
                    var nonEmpty = false;
                    for (var prop in object) {
                        if (prop.startsWith("$") && prop.endsWith("$")) {
                            continue;
                        }
                        var ss = null;
                        if (s.hasOwnProperty("properties") && s.properties.hasOwnProperty(prop)) {
                            ss = s.properties[prop];
                        }
                        if (ss === null && s.hasOwnProperty("additionalProperties")) {
                            if (typeof s.additionalProperties === 'object') {
                                ss = s.additionalProperties;
                            }
                        }
                        if (ss === null && s.hasOwnProperty("patternProperties")) {
                            for (var p in s.patternProperties) {
                                var r = RegExp(p);
                                if (prop.search(r) !== -1) {
                                    ss = s.patternProperties[p];
                                    break;
                                }
                            }
                        }
                        var value = removeEmptiesAndNulls(object[prop], ss);
                        if (value !== null) {
                            clone[prop] = value;
                            nonEmpty = true;
                        }
                    }
                    if (nonEmpty || s.required) {
                        return clone;
                    } else {
                        return null;
                    }
                } else {
                    return object;
                }
            }

            if (!container) {
                return null;
            } else {
                return removeEmptiesAndNulls(data, schema);
            }
        };

        ScoutForms.instances[ScoutForms.instances.length] = obj;

        return obj;

        function validateDepencyMapIsAcyclic() {
            function dfs(visitInfo, stack, id) {
                if (stack.hasOwnProperty(id)) {
                    error = "Schema dependency graph has cycles";
                    return;
                }
                stack[id] = null;
                if (visitInfo.hasOwnProperty(id)) {
                    return;
                }
                visitInfo[id] = null;
                var arr = dependencyMap[id];
                if (arr) {
                    for (var i = 0; i < arr.length; i++) {
                        dfs(visitInfo, stack, arr[i]);
                    }
                }
                delete stack[id];
            }

            var visitInfo = new Object();
            for (var id in dependencyMap) {
                if (visitInfo.hasOwnProperty(id)) {
                    continue;
                }
                dfs(visitInfo, new Object(), id);
            }
        }

        function appendChild(parent, child, schema) {
            parent.appendChild(child);
            for (var i = 0; i < ScoutForms.decorators.length; i++) {
                ScoutForms.decorators[i](child, schema);
            }
        }

        function createPseudoSchema(schema) {
            var pseudoSchema = new Object();
            for (var p in schema) {
                if (p === "items" || p === "properties" || p === "additionalProperties") {
                    continue;
                }
                if (p === "pattern") {
                    pseudoSchema[p] = new RegExp(schema[p]);
                } else {
                    pseudoSchema[p] = schema[p];
                }

            }
            return pseudoSchema;
        }

        function getDefinition(path) {
            var parts = path.split('/');
            var def = root;
            for (var p in parts) {
                if (p === "0")
                    continue;
                def = def[parts[p]];

            }
            return def;
        }

        function containsStr(array, string) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] == string) {
                    return true;
                }
            }
            return false;
        }

        function renameRequiredPropeties(schema) {
            if (!schema) {
                return;
            } else if (schema.hasOwnProperty("oneOf")) {
                for (var i in schema.oneOf) {
                    renameRequiredPropeties(schema.oneOf[i]);
                }
            } else if (schema.hasOwnProperty("$ref")) {
                var newSchema = getDefinition(schema["$ref"]);
                renameRequiredPropeties(newSchema);
            } else if (schema.type === "object") {
                if (schema.properties) {
                    if (schema.hasOwnProperty("required")) {
                        if (Array.isArray(schema.required)) {
                            schema.requiredProperties = schema.required;
                            delete schema.required;
                        }
                    }
                    for (var prop in schema.properties) {
                        renameRequiredPropeties(schema.properties[prop]);
                    }
                }
                if (schema.patternProperties) {
                    for (var pat in schema.patternProperties) {
                        var s = schema.patternProperties[pat];
                        if (s.hasOwnProperty("type") || s.hasOwnProperty("$ref") || s.hasOwnProperty("oneOf")) {
                            renameRequiredPropeties(schema.patternProperties[pat]);
                        }
                    }
                }
                if (schema.additionalProperties) {
                    if (schema.additionalProperties.hasOwnProperty("type") || schema.additionalProperties.hasOwnProperty("oneOf")) {
                        renameRequiredPropeties(schema.additionalProperties);

                    }
                }
            } else if (schema.type === "array") {
                renameRequiredPropeties(schema.items);
            }
        }

        function populateSchemaMap(name, schema) {
            var pseudoSchema = createPseudoSchema(schema);
            pseudoSchema["$id"] = name;
            schemaMap[name] = pseudoSchema;

            if (!schema) {
                return;
            } else if (schema.hasOwnProperty("oneOf")) {
                pseudoSchema.oneOf = new Array();
                pseudoSchema.type = "oneOf";
                for (var i in schema.oneOf) {
                    var childProp = name + "." + i;
                    pseudoSchema.oneOf[i] = childProp;
                    populateSchemaMap(childProp, schema.oneOf[i]);
                }
            } else if (schema.hasOwnProperty("$ref")) {
                var refSchema = getDefinition(schema["$ref"]);
                if (refSchema) {
                    if (schema.hasOwnProperty("title") || schema.hasOwnProperty("description")) {
                        var clonedRefSchema = {};
                        for (var prop in refSchema) {
                            clonedRefSchema[prop] = refSchema[prop];
                        }
                        if (schema.hasOwnProperty("title")) {
                            clonedRefSchema.title = schema.title;
                        }
                        if (schema.hasOwnProperty("description")) {
                            clonedRefSchema.description = schema.description;
                        }
                        refSchema = clonedRefSchema;
                    }
                    populateSchemaMap(name, refSchema);
                }
            } else if (schema.type === "object") {
                if (schema.properties) {
                    pseudoSchema.properties = new Object();
                    for (var prop in schema.properties) {
                        var childProp = name + "." + prop;
                        pseudoSchema.properties[prop] = childProp;
                        var subSchema = schema.properties[prop];
                        if (schema.requiredProperties) {
                            if (containsStr(schema.requiredProperties, prop)) {
                                subSchema.required = true;
                            } else {
                                subSchema.required = false;
                            }
                        }
                        populateSchemaMap(childProp, subSchema);
                    }
                }
                if (schema.patternProperties) {
                    pseudoSchema.patternProperties = new Object();
                    for (var pat in schema.patternProperties) {
                        var patChildProp = name + "[" + pat + "]";
                        pseudoSchema.patternProperties[pat] = patChildProp;
                        var s = schema.patternProperties[pat];

                        if (s.hasOwnProperty("type") || s.hasOwnProperty("$ref") ||
                            s.hasOwnProperty("oneOf")) {
                            populateSchemaMap(patChildProp, schema.patternProperties[pat]);
                        } else {
                            populateSchemaMap(patChildProp, SCHEMA_ANY);
                        }
                    }
                }
                if (schema.additionalProperties) {
                    var childProp = name + "[*]";
                    pseudoSchema.additionalProperties = childProp;
                    if (schema.additionalProperties.hasOwnProperty("type") ||
                        schema.additionalProperties.hasOwnProperty("oneOf")) {
                        populateSchemaMap(childProp, schema.additionalProperties);
                    } else {
                        populateSchemaMap(childProp, SCHEMA_ANY);
                    }
                }
            } else if (schema.type === "array") {
                pseudoSchema.items = name + "[#]";
                populateSchemaMap(pseudoSchema.items, schema.items);
            }
            if (schema.hasOwnProperty("dependsOn")) {
                if (schema.dependsOn === null) {
                    schema.dependsOn = ["$"];
                }
                var arr = new Array();
                for (var i = 0; i < schema.dependsOn.length; i++) {
                    if (!schema.dependsOn[i]) {
                        arr[i] = "$";
                        // Relative cases
                    } else if (schema.dependsOn[i].startsWith("$")) {
                        arr[i] = schema.dependsOn[i];
                        // Relative cases
                    } else if (name.endsWith("]")) {
                        arr[i] = name + "." + schema.dependsOn[i];
                    } else {
                        arr[i] = name.substring(0, name.lastIndexOf(".")) + "." + schema.dependsOn[i];
                    }
                }
                schemaMap[name].dependsOn = arr;
                for (var i = 0; i < arr.length; i++) {
                    var entry = dependencyMap[arr[i]];
                    if (!entry) {
                        entry = new Array();
                        dependencyMap[arr[i]] = entry;
                    }
                    entry[entry.length] = name;
                }
            }
        }

        function renderTitle(container, title, schema) {
            if (container) {
                if (title) {
                    var titleLabel = document.createElement("label");
                    if (schema.type !== "any" && schema.type !== "object" && schema.type !== "array") {
                        titleLabel.htmlFor = getInputId();
                    }
                    var titleNode = document.createTextNode(title + ":");
                    appendChild(titleLabel, titleNode, schema);
                    if (schema.description) {
                        titleLabel.title = schema.description;
                    }
                    if (schema.required) {
                        var sup = document.createElement("sup");
                        appendChild(sup, document.createTextNode("*"), schema);
                        appendChild(titleLabel, sup, schema);
                        titleLabel.className = "required";
                    }
                    appendChild(container, titleLabel, schema);
                }
            }
        }

        function getInputId() {
            return formId + "_" + inputCounter;
        }

        function validate(element) {
            var ret = true;
            if (element.hasOwnProperty("getValidationError")) {
                var error = element.getValidationError();
                if (error) {
                    ScoutForms.onValidationError(element, error);
                    ret = false;
                } else {
                    ScoutForms.onValidationSuccess(element);
                }
            }
            if (element.childNodes) {
                for (var i = 0; i < element.childNodes.length; i++) {
                    if (!validate(element.childNodes[i])) {
                        ret = false;
                    }
                }
            }
            return ret;
        }

        function clear(container) {
            if (container) {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }
        }

        function render(titleContainer, container, id, parentObject, propertyProvider, value) {
            //console.log(id);
            var schemaId = getSchemaId(id);
            var s = getSchema(schemaId);
            renderInfoMap[schemaId] = new Object();
            renderInfoMap[schemaId].titleContainer = titleContainer;
            renderInfoMap[schemaId].container = container;
            renderInfoMap[schemaId].parentObject = parentObject;
            renderInfoMap[schemaId].propertyProvider = propertyProvider;
            renderInfoMap[schemaId].value = value;
            clear(titleContainer);
            clear(container);
            // console.log(id,s,value);
            var r = renderers[s.type];
            if (r && !s.dependsOn) {
                if (s.title) {
                    renderTitle(titleContainer, s.title, s);
                } else if (propertyProvider) {
                    renderTitle(titleContainer, propertyProvider.getValue(), s);
                }
                if (!value) {
                    if (typeof initialValue !== "undefined" && initialValue !== null) {
                        value = getInitialValue(id);
                    } else {
                        value = s.default;
                    }
                }
                r(container, id, parentObject, propertyProvider, value);
            } else if (s.$ref) {
                if (obj.schemaResolver) {
                    var cb = function (schemas) {
                        if (schemas && schemas.hasOwnProperty(id)) {
                            if (JSON.stringify(schemaMap[id]) !== JSON.stringify(schemas[id])) {
                                cleanSchemaMap(id);
                                cleanData(id);
                                populateSchemaMap(id, schemas[id]);
                                var renderInfo = renderInfoMap[id];
                                if (renderInfo) {
                                    render(renderInfo.titleContainer, renderInfo.container, id, renderInfo.parentObject, renderInfo.propertyProvider, renderInfo.value);
                                }
                            }
                        }
                        ScoutForms.onResolutionFinished(parentObject);
                    };
                    ScoutForms.onResolutionStarted(parentObject);
                    obj.schemaResolver([id], obj.getData(), cb);
                }
            }
        }

        /**
         * Used in object additionalProperties and arrays
         * @param {type} getValue
         * @param {type} onchange
         * @returns {Object.create.createPropertyProvider.ret}
         */
        function createPropertyProvider(getValue, onchange) {
            var ret = new Object();
            ret.getValue = getValue;
            ret.onchange = onchange;
            return ret;
        }

        function getInitialValue(id) {
            var ret;
            try {
                eval("ret = initialValue" + id.substring(1));
            } catch (e) {
                ret = null;
            }
            return ret;
        }

        function getValue(schema, input) {
            if (typeof input.getValue === "function") {
                return input.getValue();
            }
            var value;

            if (input.tagName.toLowerCase() === "select") {
                value = input.options[input.selectedIndex].value;
            } else {
                value = input.value;
            }
            if (value === "") {
                return null;
            }
            if (schema.type === "integer") {
                value = parseInt(value);
                if (!isFinite(value)) {
                    value = null;
                }
            } else if (schema.type === "number") {
                value = parseFloat(value);
                if (!isFinite(value)) {
                    value = null;
                }
            } else if (schema.type === "boolean") {
                if (input.tagName.toLowerCase() === "input") {
                    value = input.checked;
                    if (!value) {
                        value = false;
                    }
                } else if (input.tagName.toLowerCase() === "select") {
                    if (input.value === "true") {
                        value = true;
                    } else if (input.value === "false") {
                        value = false;
                    } else {
                        value = null;
                    }
                }
            } else if (schema.type === "any") {
                if (value) {
                    eval("value=" + value);
                }
            }
            return value;
        }

        function getSchemaId(id) {
            return id.replace(/\["[^"]*"\]/g, "[*]").replace(/\[\d*\]/g, "[#]");
        }

        function getParentSchemaId(id) {
            return id.substring(0, id.lastIndexOf("."));
        }

        function getSchema(schemaId) {
            return schemaMap[schemaId];
        }

        function cleanSchemaMap(schemaId) {
            for (var prop in schemaMap) {
                if (prop.startsWith(schemaId)) {
                    delete schemaMap[prop];
                }
            }
        }

        function cleanData(schemaId) {
            var expression = new Expression(schemaId);
            expression.visit(data, function (data, parent, property) {
                delete parent[property];
            });
        }

        function onDependencyChanged(name, source) {

            var arr = dependencyMap[name];
            if (!arr || !obj.schemaResolver) {
                return;
            }
            var cb = function (schemas) {
                if (schemas) {
                    for (var id in schemas) {
                        if (JSON.stringify(schemaMap[id]) !== JSON.stringify(schemas[id])) {
                            cleanSchemaMap(id);
                            cleanData(id);
                            populateSchemaMap(id, schemas[id]);
                            var renderInfo = renderInfoMap[id];
                            if (renderInfo) {
                                render(renderInfo.titleContainer, renderInfo.container, id, renderInfo.parentObject, renderInfo.propertyProvider, renderInfo.value);
                            }
                        }
                    }
                }
                ScoutForms.onResolutionFinished(source);
            };
            ScoutForms.onResolutionStarted(source);
            obj.schemaResolver(arr, obj.getData(), cb);


        }

        function Expression(exp) {
            if (exp === null || exp.length === 0 || exp === ".") {
                exp = "$";
            }
            var queue = new Array();
            var tokens = parseTokens(exp);
            var isInBracket = false;
            var numInBracket = 0;
            var sb = "";
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (token === "[") {
                    if (isInBracket) {
                        throw ("Error parsing expression '" + exp + "': Nested [ found");
                    }
                    isInBracket = true;
                    numInBracket = 0;
                    sb = sb + token;
                } else if (token === "]") {
                    if (!isInBracket) {
                        throw ("Error parsing expression '" + exp + "': Unbalanced ] found");
                    }
                    isInBracket = false;
                    sb = sb + token;
                    queue[queue.length] = sb;
                    sb = "";
                } else {
                    if (isInBracket) {
                        if (numInBracket > 0) {
                            throw ("Error parsing expression '" + exp + "': Multiple tokens found inside a bracket");
                        }
                        sb = sb + token;
                        numInBracket++;
                    } else {
                        queue[queue.length] = token;
                    }
                }
                if (i === tokens.length - 1) {
                    if (isInBracket) {
                        throw ("Error parsing expression '" + exp + "': Unbalanced [ found");
                    }
                }
            }
            this.exp = exp;
            this.queue = queue;
            this.visit = function (data, visitor) {
                function visit(name, queue, data, parentData, property) {
                    if (data == null) {
                        return;
                    }
                    var currentToken = queue.shift();
                    if (currentToken === "$") {
                        name = "$";
                        var currentToken = queue.shift();
                    }
                    if (!currentToken) {
                        visitor(data, parentData, property);
                    } else if (Array.isArray(data)) {
                        if (!currentToken.startsWith("[")) {
                            throw ("Node '" + name + "' is of type array");
                        }
                        var element = currentToken.substring(1, currentToken.length - 1);
                        if (element.equals("#")) {
                            for (var i = 0; i < data.length; i++) {
                                var child = data[i];
                                visit(name + currentToken, queue.slice(0), child, data, i);
                                visit(name + "[" + i + "]", queue.slice(0), child, data, i);
                            }
                        } else if (element === "$") {
                            var child = data[data.length - 1];
                            visit(name + currentToken, queue.slice(0), child, data, data.length - 1);
                        } else {
                            var index = parseInt(element);
                            if (isNaN(index)) {
                                throw ("Element '" + element + "' of node '" + name + "' is not an integer, or the '$' last element symbol,  or the wilcard symbol '#'");
                            }
                            if (index < 0) {
                                throw ("Element '" + element + "' of node '" + name + "' is lower than zero");
                            }
                            var child = data[index];
                            visit(name + currentToken, queue.slice(0), child, data, index);
                        }
                    } else if ("object" === typeof data) {
                        if (currentToken === "[*]") {
                            for (var p in data) {
                                var child = data[p];
                                visit(name + currentToken, queue.slice(0), child, data, p);
                                visit(name + "[\"" + p + "\"]", queue.slice(0), child, data, p);
                            }
                        } else {
                            var child;
                            if (currentToken.startsWith("[")) {
                                var element = currentToken.substring(1, currentToken.length - 1);
                                if (element.startsWith("\"") || element.startsWith("'")) {
                                    element = element.substring(1, element.length() - 1);
                                } else {
                                    throw ("Element '" + element + "' of node '" + name + "' must be a string expression or wilcard '*'");
                                }
                                name = name + currentToken;
                                child = data[element];
                            } else {
                                if (name.length > 0) {
                                    name = name + "." + currentToken;
                                } else {
                                    name = currentToken;
                                }
                                child = data[currentToken];
                            }
                            visit(name, queue, child, data, currentToken);
                        }
                    } else if ("boolean" === typeof data
                        || "number" === typeof data
                        || "string" === typeof data) {
                        throw ("Node is leaf but still are tokens remaining: " + currentToken);
                    } else {
                        throw ("Node type '" + typeof data + "' not supported for index field '" + name + "'");
                    }
                }

                visit(this.exp, this.queue, data);
            };

            function parseTokens(exp) {
                if (exp === null) {
                    return null;
                }
                var ret = new Array();
                var commentChar = null;
                var start = 0;
                for (var i = 0; i < exp.length; i++) {
                    if (exp.charAt(i) === '"') {
                        if (commentChar === null) {
                            commentChar = '"';
                        } else if (commentChar === '"') {
                            commentChar = null;
                            ret[ret.length] = exp.substring(start, i + 1).trim();
                            start = i + 1;
                        }
                    } else if (exp.charAt(i) === '\'') {
                        if (commentChar === null) {
                            commentChar = '\'';
                        } else if (commentChar === '\'') {
                            commentChar = null;
                            ret[ret.length] = exp.substring(start, i + 1).trim();
                            start = i + 1;
                        }
                    } else if (exp.charAt(i) === '[') {
                        if (commentChar === null) {
                            if (start !== i) {
                                ret[ret.length] = exp.substring(start, i).trim();
                            }
                            ret[ret.length] = "[";
                            start = i + 1;
                        }
                    } else if (exp.charAt(i) === ']') {
                        if (commentChar === null) {
                            if (start !== i) {
                                ret[ret.length] = exp.substring(start, i).trim();
                            }
                            ret[ret.length] = "]";
                            start = i + 1;
                        }
                    } else if (exp.charAt(i) === '.') {
                        if (commentChar === null) {
                            if (start !== i) {
                                ret[ret.length] = exp.substring(start, i).trim();
                            }
                            start = i + 1;
                        }
                    } else if (i === exp.length - 1) {
                        ret[ret.length] = exp.substring(start, i + 1).trim();
                    }
                }
                return ret;
            }
        }
    };
    brutusin["json-forms"] = ScoutForms;
}());