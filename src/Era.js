// jshint esversion:6, -W004, -W030, -W083, -W084

const {Era, _, N, $, $$, html, css} = (function(window, document)
{
	"use strict";

	class Era
	{
		static init()
		{
			this._readyCbs	= [];
			this._loadCbs	= [];

			document.addEventListener("DOMContentLoaded", () =>
			{
				this._ready = true;

				for(let cb of this._readyCbs)
				{
					cb();
				}
			});

			window.addEventListener("load", () =>
			{
				this._loaded = true;
				
				for(let cb of this._loadCbs)
				{
					cb();
				}
			});
		}

		static is(val)
		{
			return !(val === null || typeof val == "undefined");
		}

		static copy(obj, props)
		{
			if(!props)
			{
				return Object.assign({}, obj);
			}

			const res = {};

			for(let name of props)
			{
				if(name in obj)
				{
					res[name] = obj[name];
				}
			}

			return res;
		}


		static ext()
		{
			var obj = arguments[0] || {};

			for(let obj2 of arguments)
			{
				for(let k in obj2)
				{
					obj[k] = obj2[k];
				}
			}

			return obj;
		}

		static ready(cb)
		{
			if(arguments.length > 1)
			{
				var req = arguments[0],
					cbf = arguments[1];

				cb = () =>
				{
					Era.Loader.lib(req, cbf);
				};
			}

			if(this._ready)
			{
				return cb();
			}

			this._readyCbs.push(cb);
		}

		static load(cb)
		{
			if(this._loaded)
			{
				return cb();
			}

			this._loadCbs.push(cb);
		}

		static matchMedia(rule, cb = null)
		{
			const mq = window.matchMedia(rule);

			if(cb)
			{
				mq.addListener(cb);
			}
			
			return mq;
		}

		static request(url, opts = {})
		{
			var headers = opts.headers || {},
				body;
			
			if(opts.data)
			{
				if(opts.data instanceof EraFormData)
				{
					body = opts.data.native();
				}
				else if(opts.data instanceof FormData)
				{
					body = opts.data;
				}
				else if(typeof opts.data == "object")
				{
					body = new FormData();
					
					for(let key in opts.data)
					{
						body.append(key, opts.data[key]);
					}
				}
			}
			else if(opts.json)
			{
				body = opts.json;

				if(body instanceof EraFormData)
				{
					body = body.object();
				}

				body = JSON.stringify(body);

				headers["Content-Type"] = "application/json";
			}

			var params = {
				method: opts.method || "GET",
				headers: headers || {},
				credentials: opts.credentials || "include",
				cache: "reload"
			};

			if(body)
			{
				params.body = body;
			}

			return fetch(url, params)
			.then((res) =>
			{
				if(!res.ok)
				{
					throw Error(res.statusText);
				}
				
				let parse = opts.parse;

				if(!parse)
				{
					let type = res.headers.get('Content-Type');

					switch(type)
					{
						case 'application/json':
							parse = "json";
						break;
						case 'text/html':
							parse = "text";
						break;
						default:

							if(type.match(/^text\/*/))
							{
								parse = "text";
							}

						break;

					}
				}
				
				switch(parse)
				{
					case 'json': return res.json();
					case 'text': return res.text();
				}

				return res;
			})
			.then((res) => 
			{
				if(opts.success) opts.success(res);

				return res;
			})
			.catch(e =>
			{
				if(opts.error) opts.error(e);
			});
		}
		
		static get(url, opts = {})
		{
			opts.method = "GET";

			return this.request(url, opts);
		}

		static post(url, data = {}, opts = {})
		{
			opts.method = "POST";
			opts.data = data;
			
			return this.request(url, opts);
		}

		

		static str(val)
		{
			if(val instanceof EraDOM)
			{
				val = val.firstNode();
			}

			if(val instanceof Element)
			{
				return val.outerHTML;
			}

			if(val && typeof val == "object")
			{
				if(val instanceof Object || val instanceof Array)
				{
					return JSON.stringify(val);
				}

				if(val.toJSON)
				{
					return val.toJSON();
				}
			}

			return JSON.stringify(val);
		}

		static guid()
		{
			return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c) =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			);
		}

		static delayed(fn, tm, bind)
		{
			tm = tm || 500;
		
			var res = function()
			{
				var args = arguments;
		
				res._to && clearTimeout(res._to);
		
				res._to = setTimeout(function()
				{
					res._to = null;
		
					res.fn.apply(bind, args);
				}, tm);
			};
		
			res.clear = function()
			{
				res._to && clearTimeout(res._to);
			};
		
			res.time = function(ntm)
			{
				tm = ntm || 500;
			};
		
			res.fn = fn;
		
			return res;
		}
	}

	class EraDOM
	{
		constructor(selector, $parent, single, dyn)
		{
			this.$parent	= EraDOM.getQueryRoot($parent);

			this.selector	= null;
			this.dynamic	= !!dyn;
			this.nodes		= [];
			this.params		= new Map();
			this.single		= single;

			
			if(selector instanceof Element || selector instanceof Document)
			{
				this.nodes.push(selector);
			}
			else if(selector instanceof EraDOM)
			{
				this.nodes		= selector.getNodes();
			}
			else if(selector instanceof Array)
			{
				this.nodes = selector;
			}
			else if(typeof selector == "string")
			{
				this.selector = selector;

				this.getNodes(true);
			}
		}

		toString()
		{
			return this.firstNode().outerHTML;
		}

		static getNode($parent, $into)
		{
			if(!$parent)
			{
				return document;
			}
			
			if($parent instanceof Element || $parent instanceof DocumentFragment)
			{
				return $parent;
			}

			if(typeof $parent == "string")
			{
				if($parent.match(/\s*\</))
				{
					$parent = EraDOM.nodeFrom($parent);

					if($parent instanceof DocumentFragment)
					{
						$parent = $parent.firstChild;
					}
				}
				else
				{
					$parent = ($into || document).querySelector($parent);
				}
			}
			else if($parent instanceof EraDOM)
			{
				$parent = $parent.firstNode();
			}
			else if($parent instanceof Array)
			{
				$parent = EraDOM.nodeFrom($parent);
			}

			if($parent && $parent.nodeName == "TEMPLATE" && $parent.content)
			{
				let $f = document.importNode($parent.content, true);

				$parent =  $f.querySelector('*');
			}

			return $parent;
		}

		static getQueryRoot($parent, $into)
		{
			$parent = this.getNode($parent, $into);

			if(!$parent || !("querySelector" in $parent))
			{
				throw Error("Invalid Query Root");
			}

			return $parent;
		}

		getNodes(force)
		{
			if(this.selector && (this.dynamic || force))
			{
				var $parent = this.$parent || document;

				if(this.single)
				{
					this.nodes = [];

					var $el = EraDOM.getNode(this.selector, $parent);
					
					if($el)
					{
						this.nodes.push($el);
					}
				}
				else
				{
					this.nodes = Array.from($parent.querySelectorAll(this.selector));
				}
			}

			return this.nodes;
		}

		count()
		{
			return this.getNodes().length;
		}

		with(cb = null)
		{

			if(this.getNodes().length > 0)
			{
				if(cb)
				{
					return cb.call(this, this);
				}

				return true;
			}

			return false;
		}

		anime(opts)
		{
			if(!("anime" in window))
			{
				throw Error("anime.js not loaded");
			}

			opts.targets = this.getNodes();

			return anime(opts);
		}

		static anime(opts)
		{
			if(!("anime" in window))
			{
				throw Error("anime.js not loaded");
			}

			return anime(opts);
		}

		has($el)
		{
			var $$nodes = this.getNodes();

			return ($$nodes.indexOf($el) > -1);
		}

		firstNode()
		{
			return this.getNodes()[0];
		}

		nodeAtIndex(index)
		{
			return this.getNodes()[index];
		}

		setParam(key, value)
		{
			this.params.set(key, value);

			return this;
		}

		itemAtIndex(index)
		{
			const $node = this.nodeAtIndex(index);

			return $node ? $($node) : null;
		}

		map(cb)
		{
			return this.getNodes().map(($el, i) =>
			{
				return cb.call(this, new EraDOM($el), i);
			});
		}

		each(cb)
		{
			this.getNodes().forEach(($el, i) =>
			{
				cb.call(this, new EraDOM($el), i);
			});

			return this;
		}

		[Symbol.iterator]()
		{
			var index = 0,
				data  = this.getNodes();
		  
			return {
				next: function ()
				{
					return {
						value: new EraDOM(data[++index]),
						done: !(index in data)
					};
				}
			};
		}

		get length()
		{
			return this.getNodes().length;
		}

		$(sel, dyn)
		{
			return new EraDOM(sel, this, true, dyn);
		}

		$$(sel, dyn)
		{
			return new EraDOM(sel, this, false, dyn);
		}

		append()
		{
			var $el = this.firstNode();

			if($el)
			{
				var $f = document.createDocumentFragment(),
					argsLen = arguments.length,
					i = 0;
				
				while (i < argsLen)
				{
					$f.appendChild(EraDOM.nodeFrom(arguments[i++]));
				}
	
				$el.appendChild($f);
			}

			return this;
		}


		appendBefore()
		{
			var $el = this.firstNode();

			if($el)
			{
				var fragment = document.createDocumentFragment(),
					argumentsLength = arguments.length,
					i = 0;

				while (i < argumentsLength)
				{
					fragment.appendChild(N(arguments[i++]));
				}

				if($el.parentNode)
				{
					$el.parentNode.insertBefore(fragment, $el);
				}
			}

			return this;
		}

		appendAfter()
		{
			var $el = this.firstNode();

			if($el)
			{
				var fragment = document.createDocumentFragment(),
					argumentsLength = arguments.length,
					i = 0,
					nextNode;

				while (i < argumentsLength)
				{
					fragment.appendChild(N(arguments[i++]));
				}

				if($el.parentNode)
				{
					if ((nextNode = $el.nextSibling))
					{
						$el.parentNode.insertBefore(fragment, nextNode);
					}
					else
					{
						$el.parentNode.appendChild(fragment);
					}
				}
			}

			return this;
		}

		prepend()
		{
			var $el = this.firstNode();

			if($el)
			{
				var fragment = document.createDocumentFragment(),
					argsLen = arguments.length,
					i = 0,
					firstChild;

				while (i < argsLen)
				{
					fragment.appendChild(EraDOM.nodeFrom(arguments[i++]));
				}

				if ((firstChild = $el.firstChild))
				{
					$el.insertBefore(fragment, firstChild);
				}
				else
				{
					$el.appendChild(fragment);
				}
			}

			return this;
		}

		empty()
		{
			var $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				let style = $el.style,
					display = style.display;
				
				style.display = 'none';

				while ($el.firstChild)
				{
					$el.removeChild($el.firstChild);
				}

				style.display = display;
			}

			return this;
		}
		
		replace()
		{
			this.empty();

			return this.append.apply(this, arguments);
		}

		remove()
		{
			var $$nodes = this.getNodes();

			for(let $el of $$nodes)
			{
				if($el.parentNode)
				{
					$el.parentNode.removeChild($el);
				}
			}

			return this;
		}

		getParent(query)
		{
			var $el = this.firstNode();

			if (query)
			{
				var $parent = $el;

				switch(typeof query)
				{
					case 'number':

						var i = query;

						while (($parent = $parent.parentNode) && $parent != document)
						{
							if(--i === 0)
							{
								return new EraDOM($parent);
							}
						}

					break;
					case 'string':

						var range$ = EraDOM.$$(query);

						while ($parent)
						{
							if (range$.has($parent) && $parent != document)
							{
								return new EraDOM($parent);
							}

							$parent = $parent.parentNode;
						}

					break;
					case 'function':

						while (($parent = $parent.parentNode) && $parent != document)
						{
							if(query.call($parent, this))
							{
								return new EraDOM($parent);
							}
						}

					break;
				}

				return null;
			}

			return new EraDOM($el.parentNode);
		}
		

		setData(key, value)
		{
			var $$nodes = this.getNodes();

			key = `data-${key}`;

			if(typeof value != "string")
			{
				value = JSON.stringify(value);
			}

			for(let $el of $$nodes)
			{
				$el.setAttribute(key, value);
			}

			return this;
		}

		set(name, val)
		{
			if(typeof name == "object")
			{
				for(let k in name)
				{
					this.set(k, name[k]);
				}

				return this;
			}

			if(typeof val == "function")
			{
				this.on(name, val);

				return this;
			}

			switch(name)
			{
				case 'cls':
				case 'class':
				case 'classes':
				case 'className':
					this.addCls(val);
				break;
				case 'data':
					this.addData(val);
				break;
				case 'style':
				case 'css':
					this.css(val);
				break;
				case 'parent':
					$(val).append(this.firstNode());
				break;
				default:
					this.setAttr(name, val);
				break;
			}

			return this;
		}

		getData(key)
		{
			const $node = this.firstNode();

			if(!$node)
			{
				return null;
			}

			var data = $node.getAttribute("data-" + key);
			
			if(data)
			{
				var parsedData;

				try
				{
					parsedData = JSON.parse(data.toString());
				}
				catch(e)
				{

				}

				if(Era.is(parsedData))
				{
					data = parsedData;
				}
			}

			return data;
		}

		setAttr(key, value)
		{
			var $$nodes = this.getNodes();

			for(let $el of $$nodes)
			{
				$el.setAttribute(key, value);
			}

			return this;
		}

		getAttr(key)
		{
			return this.firstNode().getAttribute(key);
		}
		

		setCls(cls)
		{
			const clsMap = EraCSS.mapClasses(cls);

			cls = clsMap.add.join(" ");

			this.removeCls(clsMap.remove);

			this.addCls(clsMap.add);

			return this;
		}

		addCls(cls)
		{
			const clsMap = EraCSS.mapClasses(cls);

			const $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				for(let tkn of clsMap.add)
				{
					$el.classList.add(tkn);
				}
			}

			return this;
		}

		hasCls(cls)
		{
			return this.firstNode().classList.contains(cls);
		}

		removeCls(cls)
		{
			const clsMap = EraCSS.mapClasses(cls);

			const $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				for(let tkn of clsMap.add)
				{
					$el.classList.remove(tkn);
				}
			}

			return this;
		}
		
		toggleCls(cls)
		{
			const clsMap = EraCSS.mapClasses(cls);

			var $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				for(let tkn of clsMap.add)
				{
					$el.classList.toggle(tkn);
				}
			}

			return this;
		}

		ifCls(cls, check)
		{
			return check ? this.addCls(cls) : this.removeCls(cls);
		}

		unsetData(key)
		{
			var $$nodes = this.getNodes();
			
			key = `data-${key}`;

			for(let $el of $$nodes)
			{
				$el.removeAttribute(key);
			}

			return this;
		}

		css()
		{
			return this.setStyle.apply(this, arguments);
		}

		setStyle(props, value, important = false)
		{
			var $$nodes = this.getNodes();

			if(typeof props == "string")
			{
				var key = props;
				props = {};
				props[key] = value;
			}
			else
			{
				important = !!value;
			}
			
			for(let key in props)
			{
				let val = props[key];

				key = EraStrings.hypenize(key);

				val = EraCSS.parseValue(key, val);

				switch(key)
				{
					case "background-image-url":

						val = `url('${val}')`;

						key = "background-image";

					break;
				}

				for(let $el of $$nodes)
				{
					$el.style.setProperty(key, val);
				}
			}
			
			return this;
		}

		// TODO: getStyle

		getName()
		{
			const $node = this.firstNode();

			return $node ? $node.name : null;
		}

		submit()
		{
			const $node = this.firstNode();

			if($node && $node.submit)
			{
				$node.submit();
			}
		}

		getValue(asLabel)
		{
			const $el = this.firstNode();

			if(!$el)
			{
				return null;
			}

			switch ($el.nodeName.toLowerCase())
			{
				case 'select':

					var options = $el.options,
						index = $el.selectedIndex;

					if (index < 0)
					{
						return null;
					}

					if ($el.type == 'select-multiple')
					{
						var i = options.length,
							values = [];

						while (i)
						{
							let $option = options[--i];

							if ($option.selected)
							{
								let option$ = new EraDOM($option);

								values.push(option$.getValue(asLabel));
							}
						}

						return values;
					}

					let $option = options[index];

					if ($option.selected)
					{
						let option$ = new EraDOM($option);

						return option$.getValue(asLabel);
					}

					break;

				case 'option':

					return (typeof asLabel == 'string')	? $el.getData(asLabel)
						: ((($el.attributes.value || {}).specified && !asLabel) ? $el.value
							: $el.text
						);

				case 'input':

					if($el.type == 'file')
					{
						var files = $el.files;

						if(!files)
						{
							files = [];

							if($el.file)
							{
								files = [$el.file];
							}
						}

						files = Array.from(files);

						return ($el.multiple ? files : files[0]);
					}

					if($el.type == 'checkbox')
					{
						return ($el.checked) ? $el.value : ($el.value == "1" && !$el.name.match(/\[\]$/) ? "0" : $el);
					}

					if($el.type == 'radio')
					{
						if($el.name)
						{
							var val = null;

							EraDOM.$$('input[type=radio][name=' + $el.name + ']', this.getParent('form, body'), function($other)
							{
								if($other.checked)
								{
									val = $other.value;
								}
							});

							return val;
						}

						return ($el.checked) ? $el.value : null;
					}

				break;
			}

			return $el.value || "";
		}

		setValue(newValue)
		{
			const $el = this.firstNode();

			if(!$el || !Era.is(newValue))
			{
				return this;
			}
			
			const oldValue	= this.getValue();

			if (/radio|checkbox/.test($el.type))
			{
				if(typeof newValue == 'boolean')
				{
					$el.checked = newValue;
				}
				else
				{
					newValue = [].concat(newValue);

					$el.checked = (newValue.indexOf($el.value) > -1 || newValue.indexOf($el.name) > -1);
				}
			}
			else if ($el.nodeName.toLowerCase() == 'select')
			{
				newValue = [].concat(newValue);

				newValue.forEach(function(val, i)
				{
					newValue[i] = val.toString();
				});

				var options = $el.options,
					i = options.length,
					option;

				while (i)
				{
					option = options[--i];

					option.selected = (newValue.indexOf(option.value) > -1 || newValue.indexOf(option.text) > -1);
				}
			}
			else
			{
				$el.value = newValue;
			}

			if(oldValue !== newValue)
			{
				this.fire('change');
			}

			return this;
		}

		hasEventTarget(ev)
		{
			const $$nodes = this.getNodes();

			return ($$nodes.indexOf(ev.target) > -1);
		}

		on(name, cb)
		{
			const $$nodes = this.getNodes();

			const eventInfo = EraEvent.getEventInfo(name, cb);
			
			for(let $el of $$nodes)
			{
				$el.addEventListener(eventInfo.name, function(e)
				{
					return eventInfo.callback.call(new EraDOM(this), e);
				});
			}

			return this;
		}

		onl(name, selector, cb)
		{
			var $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				(($parent) =>
				{
					$parent.addEventListener(name, function(ev)
					{
						var $$all = Array.from($parent.querySelectorAll(selector)),
							$actEl = ev.target;
			
						while ($actEl)
						{
							if ($$all.indexOf($actEl) > -1)
							{
								cb.apply(new EraDOM($actEl), arguments);
			
								if(event.stopped)
								{
									break;
								}
							}
			
							$actEl = $actEl.parentNode;
						}
					});
					
				})($el);
			}

			return this;
		}

		off(name, cb)
		{
			var $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				$el.removeEventListener(name, cb);
			}

			return this;
		}

		fire(name, data)
		{
			var $$nodes = this.getNodes();
			
			for(let $el of $$nodes)
			{
				var ev = document.createEvent("HTMLEvents");
				
				ev.initEvent(name, true, true);
	
				ev.data = data;

				$el.dispatchEvent(ev);
			}
	
			return this;
		}

		onClick(cb)
		{
			return this.on('click', cb);
		}

		onFocus(cb)
		{
			return this.on('focus', cb);
		}

		onBlur(cb)
		{
			return this.on('blur', cb);
		}

		onChange(cb)
		{
			this.on('change', cb);
			this.on('input', cb);

			return this;
		}

		focus()
		{
			var $el = this.firstNode();

			$el.focus();
		}

		blur()
		{
			var $el = this.firstNode();

			$el.blur();
		}

		click()
		{
			var $el = this.firstNode();

			$el.click();
		}

		getFormData()
		{
			var ret = new EraFormData();

			this.$$('input, textarea, select, button').each((input$) =>
			{
				var name = input$.getName();
				
				if(!name)
				{
					return;
				}

				var val = input$.getValue();

				if(val !== null)
				{
					ret.append(name, val);
				}
			});

			return ret;
		}

		resetForm()
		{
			this.$$('input, textarea, select, button').each((input$) =>
			{
				input$.setValue("");
			});
		}

		editable(enable)
		{
			var $$nodes = this.getNodes();

			var val = enable !== false ? 'true' : 'false';
			
			for(let $el of $$nodes)
			{
				$el.contentEditable = val;
			}

			return this;
		}

		/*size()
		{
			var $el = this.firstNode();

			if(!$el.offsetWidth && !$el.offsetHeight)
			{
				return EraCSS._cssSwap($el, {
					position: "absolute", visibility: "hidden", display: "block"
				}, () =>
				{
					return {
						width: $el.offsetWidth,
						height: $el.offsetHeight
					};
				});
			}

			return {
				width: $el.offsetWidth,
				height: $el.offsetHeight
			};
		}*/

		getRect($rel)
		{
			var $el = this.firstNode();

			if($el)
			{
				var elemRect = $el.getBoundingClientRect();
				

				if($rel === true)
				{
					return {
						left: elemRect.left,
						top: elemRect.top,
						bottom: elemRect.bottom,
						right: elemRect.right,
						width: elemRect.width,
						height: elemRect.height
					};
				}

				if(typeof $rel == "string")
				{
					$rel = document.querySelector($rel);
				}

				if($rel)
				{
					var relRect = $rel.getBoundingClientRect(),
						top   = elemRect.top - relRect.top,
						left   = elemRect.left - relRect.left,
						bottom   = elemRect.bottom - relRect.bottom,
						right   = elemRect.right - relRect.right;

					return {
						left: left,
						top: top,
						bottom: bottom,
						right: right,
						width: elemRect.width,
						height: elemRect.height
					};
				}

				var top   = elemRect.top + window.scrollY,
					left   = elemRect.left + window.scrollX;

				return {
					left: left,
					top: top,
					bottom: elemRect.bottom,
					right: elemRect.right,
					width: elemRect.width,
					height: elemRect.height
				};
			}

			return {
				left: 0,
				top: 0,
				bottom: 0,
				right: 0,
				width: 0,
				height: 0
			};
		}

		isHidden()
		{
			var $el = this.firstNode();

			return (!$el.offsetWidth || !$el.offsetHeight);
		}

		static $(selector, $parent, fn)
		{
			if(typeof $parent == "function")
			{
				fn = $parent;
				$parent = null;
			}

			var el$ = new EraDOM(selector, $parent, true);

			if(fn)
			{
				el$.each(fn);
			}

			return el$;
		}

		static $$(selector, $parent, fn)
		{
			if(typeof $parent == "function")
			{
				fn = $parent;
				$parent = null;
			}

			var el$ = new EraDOM(selector, $parent);
			
			if(fn)
			{
				el$.each(fn);
			}

			return el$;
		}

		static nodeFrom(data, $parent)
		{
			const isTag = function(data)
			{
				return data.trim().match(/^<.+>/m);
			};

			const build = () =>
			{
				if(data instanceof EraDOM)
				{
					return data.firstNode();
				}

				if(data instanceof Node)
				{
					return data;
				}

				if(["string", "number"].indexOf(typeof data) > -1)
				{
					data = data.toString();

					if(isTag(data))
					{
						var $temp = document.createElement('div');

						$temp.innerHTML = data.trim();

						var $el = document.createDocumentFragment();

						$temp.childNodes.forEach(($node) =>
						{
							$el.appendChild($node);
						});

						return $el;
					}

					return document.createTextNode(data);
				}

				if(data instanceof Array)
				{
					if(data.length > 0)
					{
						if(data[0] instanceof Node)
						{
							var $el = document.createDocumentFragment();
						}
						else if(typeof data[0] == "string" && isTag(data[0]))
						{
							var $el = document.createDocumentFragment();
						}
						else
						{
							var name = data.shift();

							var $el = document.createElement(name);
						}

						for(let attrs of data)
						{
							let type = typeof attrs;
	
							switch(type)
							{
								case "string":
								case "number":
	
									var $sub = this.nodeFrom(attrs);
								
									$el.appendChild($sub);
	
								break;
								case "object":
	
									if(attrs instanceof Array)
									{
										var $sub = this.nodeFrom(attrs);
	
										$el.appendChild($sub);
									}
									else if(attrs instanceof Node)
									{
										$el.appendChild(attrs);
									}
									else
									{
										$($el).set(attrs);
									}
	
								break;
							}
						}

						return $el;
					}
				}

				return document.createDocumentFragment();
			};

			var $el = build();

			if($el && $parent)
			{
				$($parent).append($el);
			}

			return $el;
		}


	}

	class EraStrings
	{
		static hypenize(text, separator = "-")
		{
			return text.replace(/[A-Z]/g, function(m)
			{
				return (separator + m.toLowerCase());
			});
		}

		static camelize(text, separator = "-", firstUpper = false)
		{
			// Cut the string into words
			const words = text.split(separator);

			// Concatenate all capitalized words to get camelized string
			var result = "";

			for (var i = 0; i < words.length; i++)
			{
				var word = words[i];

				if(i === 0 && !firstUpper)
				{
					result += word;
				}
				else
				{
					var capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
					
					result += capitalizedWord;
				}
			}

			return result;

		}
	}

	class EraNumbers
	{
		// From php.js
		static format(number, decimals, dec_point, thousands_sep)
		{
			number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
			var n = !isFinite(+number) ? 0 : +number,
				prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
				sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
				dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
				s = '',
				toFixedFix = function (n, prec) {
					var k = Math.pow(10, prec);
					return '' + Math.round(n * k) / k;
				};
			// Fix for IE parseFloat(0.55).toFixed(0) = 0;
			s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
			if (s[0].length > 3) {
				s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
			}
			if ((s[1] || '').length < prec) {
				s[1] = s[1] || '';
				s[1] += new Array(prec - s[1].length + 1).join('0');
			}
			return s.join(dec);
		}
	}

	class EraDelayManager
	{
		constructor(delay)
		{
			this.delay = delay || 0;
		}

		add(delay)
		{
			this.delay += delay;

			return this.delay;
		}

		set(delay)
		{
			this.delay = delay;

			return this.delay;
		}
	}


	class EraCSS
	{
		static _cssSwap($el, css, cb)
		{
			var oldCss = {},
				style = $el.style;

			// Remember the old values, and insert the new ones
			for (var name in css)
			{
				oldCss[name]		= style[name];
				style[name]	= css[name];
			}

			var ret = cb.call(this, oldCss, css);

			// Revert the old values
			for(name in oldCss)
			{
				style[name] = oldCss[name];
			}

			return ret;
		}

		static parseValue(key, val)
		{
			if(typeof val == "number")
			{
				var onlyNumbers = {
					"zIndex": true,
					"fontWeight": true,
					"opacity": true,
					"zoom": true
				};
				
				if(!onlyNumbers[key])
				{
					val += 'px';
				}
			}
			else if(val instanceof Array)
			{
				val = val.join('');
			}

			return val;
		}

		static parseString(str)
		{
			var attrs = str.split(';');
			var res = {};

			for(let row of attrs)
			{
				let [key, value] = row.split(':');

				key = key.trim();
				value = Era.is(value) ? value : '';

				if(value.indexOf(',') > -1)
				{
					value = value.split(/\s*,\s*/g);
				}

				if(key in res)
				{
					if(!(res[key] instanceof Array))
					{
						res[key] = [res[key]];
					}

					if(value instanceof Array)
					{
						res[key] = res[key].concat(value);
					}
					else
					{
						res[key].push(value);
					}
				}
				else
				{
					res[key] = value;
				}
				
			}

			return res;
		}

		static addStyle(css)
		{
			var el$ = $("style.era-style");

			if(el$.with())
			{
				el$.append(css);

				return this;
			}

			var $style	= N(["style", {cls: "era-style", type: "text/css"}, css]);

			var el$		= $("style, link");

			if(el$.with())
			{
				el$.appendBefore($style);

				return this;
			}

			$('head').append($style);

			return this;
		}

		static mapClasses(cls, clsMap = null)
		{
			let type = typeof cls;

			if(!clsMap)
			{
				clsMap = {
					add: [],
					remove: []
				};
			}
			
			if(type == "string")
			{
				clsMap.add.push(cls)
			}
			else if(cls instanceof Array)
			{
				for(let item of cls)
				{
					this.mapClasses(item, clsMap);
				}
			}
			else if(type == "object")
			{
				for(let name in cls)
				{
					if(cls[name])
					{
						clsMap.add.push(name);
					}
					else
					{
						clsMap.remove.push(name);
					}
				}
			}

			return clsMap;
		}
	}

	////////////////////////////////////////////////////////////////////////////////////
	// DateTime Class

	class EraDT
	{
		static tz()
		{
			return (new Date()).getTimezoneOffset();
		}

		static moment(opts = null)
		{
			return moment(opts);
		}

		static dayjs(opts = null)
		{
			return dayjs(opts);
		}
	}

	////////////////////////////////////////////////////////////////////////////////////
	// Network Class
	
	class EraNet
	{
		static axios(opts=null)
		{
			if(!window.axios)
			{
				return Promise.reject(new Error(`"axios" library not loaded`));
			}

			if(opts)
			{
				return axios.create(opts);
			}

			return axios;
		}
	}


	////////////////////////////////////////////////////////////////////////////////////
	// I18N Class

	class EraI18N
	{
		constructor(lang)
		{
			this.locale(lang);
		}

		locale(lang)
		{
			this.lang = lang;
		}

		num(val = 0, opts = {})
		{
			/*
				style: decimal, currency, percent
				currency
				currencyDisplay: symbol, code, name
				useGrouping: true, false
				minimumIntegerDigits: 1 - 21
				minimumFractionDigits: 0 - 20
				minimumSignificantDigits: 1 - 21
				maximumSignificantDigits: 1 - 21
			*/

			var i = new Intl.NumberFormat(this.lang, opts);

			return i.format(val);
		}

		curr(val = 0, opts = {})
		{
			opts.style = "currency";

			opts.currencyDisplay || (opts.currencyDisplay = 'symbol');
			opts.currency || (opts.currency = 'EUR');

			var i = new Intl.NumberFormat(this.lang, opts);

			return i.format(val);
		}

		dt(val, opts = {})
		{
			/*
				timeZone
				hour12: true, false
				formatMatcher: "basic", "best fit"
				weekday: "narrow", "short", "long"
				era: "narrow", "short", "long"
				year: "numeric", "2-digit"
				month: "numeric", "2-digit", "narrow", "short", "long"
				day: "numeric", "2-digit"
				hour: "numeric", "2-digit"
				minute: "numeric", "2-digit"
				second: "numeric", "2-digit"
				timeZoneName: "short", "long"
			*/

			if("ts" in opts)
			{
				opts.timeZone = opts.tz;
			}

			if(!("hour12" in opts))
			{
				opts.hour12 = false;
			}

			val = val || new Date();

			var i = new Intl.DateTimeFormat(this.lang, opts);

			return i.format(val);
		}

		get(key)
		{
			var list = EraI18N._strings[this.lang];

			if(!list)
			{
				return key;
			}

			return Era.is(list[key]) ? list[key] : key;
		}

		static locale(loc = null)
		{
			if(!loc)
			{
				loc = navigator.language;
			}

			var inst = EraI18N._locales[loc];

			if(!inst)
			{
				inst = new EraI18N(loc);

				EraI18N._locales[loc] = inst;
			}

			return inst;
		}

		static set(lang, list)
		{
			EraI18N._strings[lang] || (EraI18N._strings[lang] = {});

			Era.ext(EraI18N._strings[lang], list);
		}

		static getLocale()
		{
			if (navigator.languages != undefined) 
			{
				return navigator.languages[0]; 
			}
			 
			return navigator.language;
		}

		static getLanguage()
		{
			const locale = this.getLocale();

			return (locale.split("-")[0] || "").toLowerCase();
		}

		static getCountry()
		{
			const locale = this.getLocale();

			return (locale.split("-")[1] || "").toUpperCase();
		}
	}

	EraI18N._strings = {};
	EraI18N._locales = {};

	////////////////////////////////////////////////////////////////////////////////////
	class EraFormData
	{
		constructor()
		{
			this.data = [];
		}

		append(key, val)
		{
			this.data.push([key, val]);
		}

		set(key, val)
		{
			this.append(key, val);
		}

		get(key)
		{
			for(let row of this.data)
			{
				if(row[0] == key)
				{
					return row[1];
				}
			}

			return null;
		}

		getAll(key)
		{
			const res = [];

			for(let row of this.data)
			{
				if(row[0] == key)
				{
					res.push(row[1]);
				}
			}

			return res;
		}

		filled(keys)
		{
			if(keys)
			{
				for(let key of keys)	
				{
					if(!this.get(key))
					{
						return false;
					}
				}
			}
			else
			{
				for(let row of this.data)
				{
					if(!row[1])
					{
						return false;
					}
				}
			}

			return true;
		}

		// TODO: trasformare in forma verbale getNative
		native()
		{
			var fd = new FormData();

			for(var row of this.data)
			{
				fd.append(row[0], row[1]);
			}

			return fd;
		}
		
		// TODO: trasformare in forma verbale getObject
		object()
		{
			var fd = {};

			for(var row of this.data)
			{
				fd[row[0]] = row[1];
			}

			return fd;
		}

		static from(data)
		{
			const formData	= new EraFormData();

			for(let key in data)
			{
				let list = this._fromFormat(key, data[key]);

				for(let item of list)
				{
					formData.append(item[0], item[1]);
				}
			}

			return formData;
		}

		static _fromFormat(key, val)
		{
			var list = [];
			const type	= typeof val;

			if(val instanceof Array)
			{
				for(let item of val)
				{
					let sub = this._fromFormat(`${key}[]`, item);

					list = list.concat(sub);
				}
			}
			else if(type == "object")
			{
				for(let name in val)
				{
					let sub = this._fromFormat(`${key}[${name}]`, val[name]);

					list = list.concat(sub);
				}
			}
			else
			{
				list.push([key, val]);
			}

			return list;
		}
	}

	class EraTemplate
	{
		constructor(sel)
		{
			if(sel instanceof Element)
			{
				this.$tpl = sel;
			}
			else
			{
				this.$tpl = document.querySelector(sel);
			}

			if(!this.$tpl)
			{
				throw Error("Template not found");
			}

			if(!this.$tpl.content)
			{
				throw Error("Template Invalid");
			}
		}

		clone()
		{
			var $f = document.importNode(this.$tpl.content, true);

			return $f.querySelector('*');
		}

		observable(data)
		{
			return new EraDOMObservable(this.clone(), data);
		}

		static init(tpl)
		{
			if(tpl instanceof EraTemplate)
			{
				return tpl;
			}

			return new EraTemplate(tpl);
		}
	}

	class EraTemplateList
	{
		constructor(tpl, list = null, parent = null)
		{
			this.tpl		= EraTemplate.init(tpl);
			this.list		= [];
			
			this.setParent(parent);

			if(list)
			{
				this.append(list);
			}
		}

		setParent(parent)
		{
			this.parent$	= parent ? new EraDOM(parent) : null;
		}

		each(cb)
		{
			this.list.forEach(cb);
		}

		push(data)
		{
			let $el = this.tpl.clone();
			
			let obs = new EraDOMObservable($el, data);

			this.list.push({
				obs: obs,
				$el: $el
			});

			if(this.parent$)
			{
				this.parent$.append($el);
			}
		}

		append(list)
		{
			var $f = document.createDocumentFragment();

			for(let data of list)
			{
				let $el = this.tpl.clone();

				$f.appendChild($el);
				
				let obs = new EraDOMObservable($el, data);

				this.list.push({
					obs: obs,
					$el: $el
				});
			}

			if(this.parent$)
			{
				this.parent$.append($f);
			}

			return $f;
		}

		sort(cb)
		{
			this.list.sort((a, b) =>
			{
				return cb(a.obs, b.obs);
			});

			return this.refresh();
		}

		refresh()
		{
			var $f = document.createDocumentFragment();
			
			for(let row of this.list)
			{
				if(row.$el.parentNode)
				{
					row.$el.parentNode.removeChild(row.$el);
				}

				$f.appendChild(row.$el);
			}

			if(this.parent$)
			{
				this.parent$.append($f);
			}

			return $f;
		}

		getItem(i)
		{
			if(this.list[i])
			{
				return this.list[i].obs;
			}

			return null;
		}
	}

	class EraDOMObservable
	{
		constructor($el, data = null)
		{
			this.$el	= EraDOM.getQueryRoot($el);

			var events = {
				"on": {},
				"onl": {}
			};

			var proxy		= new EraObservable({
				get: (obj, key) =>
				{
					// TODO: get

					if(key in this)
					{
						return this[key];
					}

					return obj[key];
				},
				set: (obj, key, value) =>
				{
					//console.log($el, obj, key, value);

					var oldValue = obj[key];

					obj[key] = value;

					var attrName	= `:${key}`;
					var selector	= `[\\${attrName}]`;

					var $$els = Array.from(this.$el.querySelectorAll(selector));

					if(this.$el.matches(selector))
					{
						$$els.unshift(this.$el);
					}

					//console.log($$els);

					for(let $actEl of $$els)
					{
						//console.log($actEl);
						let attrValue	= $actEl.getAttribute(attrName);
						let bind		= EraCSS.parseString(attrValue);

						console.log(attrValue, bind);

						let el$			= new EraDOM($actEl);

						for(let type in bind)
						{
							let range	= bind[type],
								actVal	= value;

							switch (type)
							{
								case 'html':
								case 'text':

									if (type == "text")
									{
										actVal = document.createTextNode(actVal);
									}

									switch (range)
									{
										case 'prepend':
										
											el$.prepend(actVal);

										break;
										case 'append':

											el$.append(actVal);

										break;
										default:
										case 'replace':

											el$.replace(actVal);

										break;
									}

								break;
								case 'attr':
								case 'attribute':

									el$.setAttr(range, actVal);

								break;
								case 'cls':
								case 'class':
								case 'className':

									switch (range)
									{
										case 'toggle':
											
											el$.toggleCls(actVal);

										break;
										case 'remove':

											el$.removeCls(actVal);

										break;
										default:
										case 'add':

											el$.addCls(actVal);

										break;
									}

								break;
								case 'css':
								case 'style':

									el$.css(key, actVal);

								break;
								case 'value':

									el$.setValue(actVal);

								break;
								case 'on':
								case 'onl':

									//console.log(key, actVal);

									if(key)
									{
										if(!(key in events[type]))
										{
											el$[type](key, function()
											{
												events[type][key] && events[type][key].apply(this, arguments);
											});
										}

										events[type][key] = value;
									}

								break;
							}
						}
					}

					return true;
				}
			});

			if(data)
			{
				for(let key in data)
				{
					proxy[key] = data[key];
				}
			}

			this.proxy = proxy;

			return proxy;
		}

		$$(sel, dyn)
		{
			return new EraDOM(sel, this.$el, false, dyn);
		}

		$(sel, dyn)
		{
			return new EraDOM(sel, this.$el, true, dyn);
		}
	}

	class EraObservable
	{
		constructor(opts = {})
		{
			if(!opts.set)
			{
				opts.set = (object, name, value, proxy) =>
				{
					let oldValue = object[name];

					object[name] = value;

					this.fireEvent(change, {
						name: key,
						value: value,
						oldValue: oldValue
					});

					return true;
				};
			}

			if(!opts.get)
			{
				opts.get = (object, name) =>
				{
					return object[name];
				};
			}

			this.setData = (name, value) =>
			{
				p[name] = value;
			}

			this.fillData = (data) =>
			{
				for(let name in data)
				{
					p[name] = value;
				}
			}

			EraEvent.addEventHandlers(this, true);

			var p =  new Proxy(this, opts);

			return p;
		}
	}

	class EraEnv
	{
		static scroll()
		{
			return {
				top: window.scrollY,
				left: window.scrollX
			};
		}

		static viewport()
		{
			return {
				width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
				height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
			};
		}
	}

	// class EraEventEmitter
	// {
	// 	constructor()
	// 	{
	// 		this._listeners = new Map();
	// 	}
	
	// 	addEventListener(label, callback)
	// 	{
	// 		label = EraEventEmitter.cleanEventName(label);

	// 		this._listeners.has(label) || this._listeners.set(label, []);
	// 		this._listeners.get(label).push(callback);
	// 	}
	
	// 	removeEventListener(label, callback)
	// 	{
	// 		label = EraEventEmitter.cleanEventName(label);

	// 		let isFunction = function(obj) {
	// 			return typeof obj == 'function' || false;
	// 		};
	
	// 		let listeners = this._listeners.get(label),
	// 			index;
	
	// 		if (listeners && listeners.length)
	// 		{
	// 			index = listeners.reduce((i, listener, index) =>
	// 			{
	// 				return (isFunction(listener) && listener === callback) ?
	// 					i = index :
	// 					i;
	// 			}, -1);
	
	// 			if (index > -1)
	// 			{
	// 				listeners.splice(index, 1);
	
	// 				this._listeners.set(label, listeners);
	
	// 				return true;
	// 			}
	// 		}
	// 		return false;
	// 	}
	
	// 	fireEventt(label, ...args)
	// 	{
	// 		label = EraEventEmitter.cleanEventName(label);

	// 		let listeners = this._listeners.get(label);
	
	// 		if (listeners && listeners.length)
	// 		{
	// 			listeners.forEach((listener) =>
	// 			{
	// 				listener.apply(this, args);
	// 			});
	
	// 			return true;
	// 		}
	
	// 		return false;
	// 	}
	
	// 	on(...args)
	// 	{
	// 		this.addEventListener(...args);
	// 	}
	
	// 	off(...args)
	// 	{
	// 		this.removeEventListener(...args);
	// 	}
	
	// 	emit(...args)
	// 	{
	// 		this.fireEventt(...args);
	// 	}


	
	// 	static cleanEventName(i)
	// 	{
	// 		var m = i.match(/^on[A-Z]/i);
	
	// 		if(m)
	// 		{
	// 			i = i.substr(2, 1).toLowerCase() + i.substr(3);
	// 		}
	
	// 		return i;
	// 	}

	// 	static addEventHandlers(ClassName, statik)
	// 	{
	// 		Era.ext((statik ? ClassName : ClassName.prototype), EraEvent._addEventHandlersProto);
	// 	}

	// 	static detectEvents(options)
	// 	{
	// 		options = options || {};
	
	// 		var events = {};
	
	// 		if(typeof options.events == 'object')
	// 		{
	// 			for(var i in options.events)
	// 			{
	// 				if(typeof options.events[i] == 'function')
	// 				{
	// 					var name = EraEventEmitter.cleanEventName(i);
	
	// 					if(events[i])
	// 					{
	// 						if(!(events[name] instanceof Array))
	// 						{
	// 							events[name] = [events[name]];
	// 						}
	
	// 						events[name].push(options.events[i]);
	// 					}
	// 					else
	// 					{
	// 						events[name] = options.events[i];
	// 					}
	// 				}
	// 			}
	// 		}
	
	// 		for(var i in options)
	// 		{
	// 			if(typeof options[i] == 'function')
	// 			{
	// 				var name = EraEventEmitter.cleanEventName(i);
	
	// 				if(events[name])
	// 				{
	// 					if(!(events[name] instanceof Array))
	// 					{
	// 						events[name] = [events[name]];
	// 					}
	
	// 					events[name].push(options[i]);
	// 				}
	// 				else
	// 				{
	// 					events[name] = options[i];
	// 				}
	// 			}
	// 		}
	
	// 		return events;
	// 	}
	// }

	class EraEvent
	{
		static addEventHandlers(ClassName, statik)
		{
			Era.ext((statik ? ClassName : ClassName.prototype), EraEvent._addEventHandlersProto);
		}
	
		static cleanEventName(i)
		{
			var m = i.match(/^on[A-Z]/i);
	
			if(m)
			{
				i = i.substr(2, 1).toLowerCase() + i.substr(3);
			}
	
			return i;
		}
	
		static detectEvents(options)
		{
			options = options || {};
	
			var events = {};
	
			if(typeof options.events == 'object')
			{
				for(var i in options.events)
				{
					if(typeof options.events[i] == 'function')
					{
						var name = EraEvent.cleanEventName(i);
	
						if(events[i])
						{
							if(!(events[name] instanceof Array))
							{
								events[name] = [events[name]];
							}
	
							events[name].push(options.events[i]);
						}
						else
						{
							events[name] = options.events[i];
						}
					}
				}
			}
	
			for(var i in options)
			{
				if(typeof options[i] == 'function')
				{
					var name = EraEvent.cleanEventName(i);
	
					if(events[name])
					{
						if(!(events[name] instanceof Array))
						{
							events[name] = [events[name]];
						}
	
						events[name].push(options[i]);
					}
					else
					{
						events[name] = options[i];
					}
				}
			}
	
			return events;
		}

		static getEventInfo(name, cb)
		{
			var callback = cb;

			switch(name.toLowerCase())
			{
				case "return":

					name		= "keydown";
					callback	= function(e)
					{
						if (e.keyCode == 13)
						{
							return cb.apply(this, arguments);
						}
					};

				break;
				case "save":
				case "ctrl+s":

					name		= "keydown";
					callback	= function(e)
					{
						if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)  && e.keyCode == 83)
						{
							return cb.apply(this, arguments);
						}
					};

				break;
			}

			return {
				name,
				callback
			};
		}
	}

	EraEvent._addEventHandlersProto = {
		addEventListener: function(name, callback)
		{
			if(typeof name == 'object')
			{
				for(var i in name)
				{
					this.addEventListener(i, name[i]);
				}

				return;
			}

			if(callback instanceof Array)
			{
				for(var i = 0, len = callback.length; i < len; i++)
				{
					this.addEventListener(name, callback[i]);
				}

				return;
			}

			if(!this.events)
			{
				this.events = {};
			}

			if(typeof callback != 'function')
			{
				return false;
			}

			if(!this.events[name])
			{
				this.events[name] = [];

				if(this.initEventListener)
				{
					this.initEventListener(name);
				}
			}

			this.events[name].push(callback);

			return true;
		},
		removeEventListener: function(name, callback)
		{
			if(typeof name == 'object')
			{
				for(var i in name)
				{
					this.removeEventListener(i, name[i]);
				}

				return;
			}

			if(callback instanceof Array)
			{
				for(var i = 0, len = callback.length; i < len; i++)
				{
					this.removeEventListener(name, callback[i]);
				}

				return;
			}

			if (this.events &&  this.events[name] && (typeof callback == 'function'))
			{
				var listeners = this.events[name];

				for(var i = 0, len = listeners.length; i < len; i++)
				{
					if (listeners[i] === callback)
					{
						listeners.splice(i, 1);
					}
				}

				if(listeners.length < 1)
				{
					delete this.events[name];

					if(this.endEventListener)
					{
						this.endEventListener(name);
					}
				}

				return true;
			}

			return false;
		},
		fireEvent: function(name)
		{
			var args = Array.from(arguments);

			if(name instanceof Array)
			{
				for(var i = 0, len = name.length; i < len; i++)
				{
					args[0] = name[i];

					this.fireEvent.apply(this, args);
				}

				return;
			}

			args.shift();

			/*
			if(name.indexOf(':') > -1)
			{
				var parts = name.split(':');

				this.fireEvent(name, event);
			}*/
			

			if (this.events && this.events[name])
			{
				/*if(!(event instanceof EraEvent))
				{
					event = new EraEvent
				}*/

				//setTimeout((function() {

					var listeners = this.events[name].slice(0),
						i = 0,
						len = listeners.length;

					while (i < len)
					{
						listeners[i++].apply(this, args);
					}

				//}).bind(this), 0);
			}
		},
		on: function()
		{
			this.addEventListener.apply(this, arguments);
		},
		off: function()
		{
			this.removeEventListener.apply(this, arguments);
		},
		fire: function()
		{
			this.fireEvent.apply(this, arguments);
		}
	};

	EraEvent.addEventHandlers(Era, true);



	class EraWebSocket
	{
		constructor(options)
		{
			this.url				= options.url || options.uri;
			this.reconnectTimeout	= options.reconnectTimeout || 1000;
			this.json				= options.json;
			this.binaryType			= options.binaryType;
		
			this.addEventListener(EraEvent.detectEvents(options));
		
			if(options.autoOpen)
			{
				this.open();
			}
		}

		write(data)
		{
			if(this.isOpened())
			{
				return this.ws.send(data);
			}
	
			return false;
		}

		writeJSON(data)
		{
			if(this.isOpened())
			{
				try
				{
					data = JSON.stringify(data);
	
					return this.ws.send(data);
				}
				catch(e)
				{
					
				}
			}
	
			return false;
		}

		open()
		{
			var url = this.url;
	
			if(url.indexOf('ws://') < 0)
			{
				url = 'ws://' + url;
			}
	
			this.ws = new WebSocket(url);
	
			this.ws.binaryType = this.binaryType || "arraybuffer";
	
			this.fireEvent('connect', {
				type: 'connect'
			});
	
			this.ws.onopen = (e) =>
			{
				this.fireEvent('open', e);
			};
	
			this.ws.onclose = (e) =>
			{
				this.fireEvent('close', e);
	
				if(this.reconnectTimeout > 0)
				{
					this.fireEvent('reconnect', {
						timeout: this.reconnectTimeout
					});
	
					setTimeout(() =>
					{
						this.open();
	
					}, this.reconnectTimeout);
				}
			};
	
			this.ws.onerror = (e) =>
			{
				this.fireEvent('error', e);
			};
	
			// most important part - incoming messages
			this.ws.onmessage =  (e) =>
			{
				var data = e.data;
	
				if(self.json)
				{
					try
					{
						data = JSON.parse(data);
					}
					catch(ex)
					{
	
					}
				}
	
				this.fireEvent('message', {
					type: 'message',
					data: data,
					timeStamp: e.timeStamp,
					target: e.target
				});
			};
		}

		close()
		{
			if(this.isOpened())
			{
				this.ws.close();
				this.ws = null;
			}
		}

		isOpened()
		{
			return (this.ws && this.ws.readyState === WebSocket.OPEN);
		}

		isClosed()
		{
			return (!this.ws || this.ws.readyState === WebSocket.CLOSED);
		}
	}
	
	EraEvent.addEventHandlers(EraWebSocket);


	class EraRouter
	{
		constructor(opts={})
		{
			this.routes	= [];
			
			this.setRoot(opts.root);
		}

		setRoot(root = '')
		{
			this.root = this.clearSlashes(root);
		}

		getFragment()
		{
			var f = '';

			f = this.clearSlashes(decodeURI(location.pathname + location.search));
			f = f.replace(/\?(.*)$/, '');
			f = f.replace(new RegExp('^' + this.root), '');

			return this.clearSlashes(f);
		}

		clearSlashes(path)
		{
			return (path || '').toString().replace(/\/$/, '');
		}

		add(re, cb)
		{
			if(typeof re == 'function')
			{
				cb	= re;
				re	= '';
			}

			var keys;

			if(typeof re == "string")
			{
				keys = re.match(/:([^\/]+)/g).map((k) =>
				{
					return k.replace(/^:/, '');
				});

				re = new RegExp(re.replace(/:([^\/]+)/g, "([^\/]*)"));
			}

			this.routes.push({
				keys: keys,
				re: re,
				cb: cb
			});

			return this;
		}
		
		remove(param)
		{
			for(var i = 0, r, len = this.routes.length; i < len, r = this.routes[i]; i++)
			{
				if(r.cb === param || r.re.toString() === param.toString())
				{
					this.routes.splice(i, 1); 

					return this;
				}
			}

			return this;
		}

		check(fg, data)
		{
			fg = fg || this.getFragment();

			for(let r of this.routes)
			{
				let m = fg.match(r.re);

				if(m)
				{
					let params = m;

					m.shift();

					if(r.keys)
					{
						params = {};

						m.forEach(function (value, i)
						{
							params[r.keys[i]] = value;
						});
					}

					r.cb(params, data);

					return this;
				}           
			}

			return this;
		}

		listen()
		{
			window.addEventListener('popstate', (e) =>
			{
				this.check(null, e.state);
			});

			/*
			var current = this.getFragment();

			this.itv && clearInterval(this.itv);
			this.itv = setInterval(() =>
			{
				let fg = this.getFragment();

				if(current !== fg)
				{
					current = fg;

					this.check(fg);
				}
			}, 50);
			*/

			return this;
		}

		navigate(path, title=null, data=null)
		{
			path = this.clearSlashes(path || '');

			data = data || {
				path: path,
				title: title
			};

			var fullPath = this.root + path;

			var actPath = this.getFragment();

			if(actPath == path)
			{
				history.replaceState(data, title, fullPath);
			}
			else
			{
				history.pushState(data, title, fullPath);
			}

			this.check(null, data);

			return this;
		}
	}

	

	class EraMath
	{
		static ipo(c1, c2)
		{
			return Math.sqrt(c1 * c1 + c2 * c2);
		}
	
		static rand(n, m)
		{
			if (arguments.length < 2)
			{
				m = n;
				n = 0;
			}
	
			return n + (Math.random() * (m - n));
		}
	
		static rad(grades)
		{
			return (Math.PI / 180) * grades;
		}
	
		static deg(rad)
		{
			return (rad * 180) / Math.PI;
		}
	
		static angle(sin, cos)
		{
			var asin = Math.asin(sin), PI = Math.PI;
			return (cos > 0 ? -(asin - PI / 2) : asin + (PI * 3 / 2)) / (PI * 2);
		}
	
		static coordsAngle(x, y)
		{
			return Math.atan2(y, x);
			//var r = Math.ipo(x, y), ax = Math.acos(x / r); return y >= 0 ? ax : 2 * Math.PI - ax;
		}
	
		static angleCoords(a, r)
		{
			r = r || 1;
	
			return {
				x: Math.cos(a) * r,
				y: Math.sin(a) * r
			};
		}


		static toInt(val,  i)
		{
			var result = parseInt(val, i || 10);

			return isNaN(result) ? 0 : result;
		}
	
		static toFloat(val, i)
		{
			if(typeof val == "string")
			{
				val = val.replace(',', '.');
			}

			var result = parseFloat(val, i || 10);

			return isNaN(result) ? 0 : result;
		}

		static bound(val, n, m)
		{
			return val < n ? n : (val > m ? m : val * 1);
		}

		static round(val, p)
		{
			p = Math.pow(10, p || 0);

			return Math.round(val * p) / p;
		}
	}



	class EraColor
	{
		constructor(c)
		{
			this.red	= 0;
			this.green	= 0;
			this.blue	= 0;
			this.alpha	= 1;
		
			this.set(c);
		}

		set(c)
		{
			if (c)
			{
				var r = 0, g = 0, b = 0, a = 1;
	
				if(typeof c == 'number')
				{
					c = c.toString(16);
				}
	
				if (typeof c == 'string')
				{
					c = c.replace(/[\s]+/g, '');
	
					var i, n = EraColor.names, m;
	
					if (c.match(/^[a-z]+$/gi))
					{
						c = c.toLowerCase();
	
						for (i in n)
						{
							if (c == i.toLowerCase())
							{
								c = n[i];
	
								break;
							}
						}
					}
	
					//if((/^#[0-9A-F]{3,8}$/gi).test(c)) {
					if (c.match(/^#?[0-9A-F]{3,8}$/gi))
					{
						if(c.substr(0, 1) != '#')
						{
							c = '#' + c;
						}
	
						a = 'FF';
	
						switch (c.length)
						{
							case 4:
							case 5:
	
								r = c.substring(1, 2);
								g = c.substring(2, 3);
								b = c.substring(3, 4);
								a = c.substring(4, 5);
	
								r += r;
								g += g;
								b += b;
								a += a;
	
								break;
							default:
							case 7:
							case 9:
	
								r = c.substring(1, 3);
								g = c.substring(3, 5);
								b = c.substring(5, 7);
								a = c.substring(7, 9);
	
								break;
						}
	
						r = EraMath.toInt(r, 16);
						g = EraMath.toInt(g, 16);
						b = EraMath.toInt(b, 16);
	
						a = EraMath.toInt((a || 'FF'), 16) / 255;
					}
					else if ((m = c.match(/rgb\(([0-9]+%?),([0-9]+%?),([0-9]+%?)\)/i)) || (m = c.match(/rgba\(([0-9]+%?),([0-9]+%?),([0-9]+%?),([0-9\.]+%?)\)/i)))
					{
						r = m[1];
						g = m[2];
						b = m[3];
						a = m[4];
	
						r = EraMath.toInt(r) * (r.indexOf('%') > -1 ? 2.55 : 1);
						g = EraMath.toInt(g) * (g.indexOf('%') > -1 ? 2.55 : 1);
						b = EraMath.toInt(b) * (b.indexOf('%') > -1 ? 2.55 : 1);
	
						a = a ? (a.indexOf('%') > -1 ? EraMath.toInt(a) / 100 : EraMath.toFloat(a)) : 1;
					}
					else if ((m = c.match(/cmyk\(([0-9]+%?),([0-9]+%?),([0-9]+%?),([0-9]+%?)\)/i)) || (m = c.match(/cmyka\(([0-9]+%?),([0-9]+%?),([0-9]+%?),([0-9]+%?),([0-9\.]+%?)\)/i)))
					{
						var y = m[3], k = m[4];
						c = m[1];
						m = m[2];
						c = EraMath.toInt(c) * (c.indexOf('%') > -1 ? 2.55 : 1);
						m = EraMath.toInt(m) * (m.indexOf('%') > -1 ? 2.55 : 1);
						y = EraMath.toInt(y) * (y.indexOf('%') > -1 ? 2.55 : 1);
						k = (255 - (EraMath.toInt(k) * (k.indexOf('%') > -1 ? 2.55 : 1))) / 255;
	
						r = (255 - c) * k;
						g = (255 - m) * k;
						b = (255 - y) * k;
	
						a = (a) ? (a.indexOf('%') > -1 ? EraMath.toInt(a) * 2.55 : EraMath.toFloat(a)) : 1;
					}
					// Da HSL
					else if ((m = c.match(/hsl\(([0-9]+),*([0-9]+)%,*([0-9]+)%\)/i)) || (m = c.match(/hsla\(([0-9]+),*([0-9]+)%,*([0-9]+)%,([0-9\.]+%?)\)/i)))
					{
						return this.fromHSL(EraMath.toInt(m[1]), EraMath.toInt(m[2]), EraMath.toInt(m[3]), m[4]);
					}
					// Da HSV
					else if ((m = c.match(/hsv\(([0-9]+),*([0-9]+)%,*([0-9]+)%\)/i)) || (m = c.match(/hsva\(([0-9]+),*([0-9]+)%,*([0-9]+)%,([0-9\.]+%?)\)/i)))
					{
						return this.fromHSV(EraMath.toInt(m[1]), EraMath.toInt(m[2]), EraMath.toInt(m[3]), m[4]);
					}
				}
				else if (c instanceof Array)
				{
					r = c[0];
					g = c[1];
					b = c[2];
					a = c[3];
	
					if (!Era.is(a))
					{
						a = 1;
					}
				}
				else if (c.red || c.green || c.blue || c.alpha)
				{
					r = c.red;
					g = c.green;
					b = c.blue;
					a = c.alpha;
				}
	
				this.red	= Math.round(EraMath.bound((!isNaN(r) ? r : 255), 0, 255));
				this.green	= Math.round(EraMath.bound((!isNaN(g) ? g : 255), 0, 255));
				this.blue	= Math.round(EraMath.bound((!isNaN(b) ? b : 255), 0, 255));
				this.alpha	= EraMath.bound((!isNaN(a) ? a : 1), 0, 1);
	
				return true;
			}
	
			return false;
		}

		ease(to, dist)
		{
			to = new EraColor(to);
	
			dist = dist < 0 ? 0 : (dist > 1 ? 1 : dist);
	
			var color = new EraColor();
	
			color.red	= this.red + ((to.red - this.red) * dist);
			color.green	= this.green + ((to.green - this.green) * dist);
			color.blue	= this.blue + ((to.blue - this.blue) * dist);
			color.alpha	= this.alpha + ((to.alpha - this.alpha) * dist);
	
			return color;
		}

		media()
		{
			var a = arguments, l = a.length, i, c, r = 0, g = 0, b = 0;
	
			for (i = l - 1; i >= 0; i--)
			{
				c = new EraColor(a[i]);
				r += c.red;
				g += c.green;
				b += c.blue;
			}
	
			this.set([r / l, g / l, b / l]);
		}

		near(color, diff, alpha)
		{
			var thisHSL = this.toHSL();
			var colorHSL = color.toHSL();
	
			var aDiff = diff / 100;
	
			return (
				(colorHSL[0] >= thisHSL[0] - diff * 3.6 && colorHSL[0] <= thisHSL[0] + diff * 3.6)
				&& (colorHSL[1] >= thisHSL[1] - diff && colorHSL[1] <= thisHSL[1] + diff)
				&& (colorHSL[2] >= thisHSL[2] - diff && colorHSL[2] <= thisHSL[2] + diff)
				&& (!alpha || (color.alpha >= this.alpha - diff / 100 && color.alpha <= this.alpha + diff / 100))
			);
		}

		decHex(o)
		{
			o = EraMath.bound(Math.round(o), 0, 255);
	
			return (o < 16 ? '0' : '') + o.toString(16);
		}

		hex(a)
		{
			return ('#' + this.decHex(this.red) + this.decHex(this.green) + this.decHex(this.blue) + (a ? this.decHex(this.alpha * 255) : '')).toUpperCase();
		}

		hexa(a)
		{
			return this.hex(true);
		}

		ahex(a)
		{
			return ('#' + this.decHex(this.alpha * 255) + this.decHex(this.red) + this.decHex(this.green) + this.decHex(this.blue)).toUpperCase();
		}

		rgb()
		{
			return 'rgb(' + Math.round(this.red) + ', ' + Math.round(this.green) + ', ' + Math.round(this.blue) + ')';
		}

		rgba(support)
		{
			return 'rgba(' + Math.round(this.red) + ', ' + Math.round(this.green) + ', ' + Math.round(this.blue) + ', ' + EraMath.round(this.alpha, 2) + ')';
		}

		hsl()
		{
			var hsl = this.toHSL();
	
			return 'hsl(' + Math.round(hsl[0]) + ', ' + Math.round(hsl[1]) + '%, ' + Math.round(hsl[2]) + '%)';
		}

		hsla()
		{
			var hsl = this.toHSL();
	
			return 'hsla(' + Math.round(hsl[0]) + ', ' + Math.round(hsl[1]) + '%, ' + Math.round(hsl[2]) + '%, ' + EraMath.round(this.alpha, 2) + ')';
		}
	
		// GET HSL
		toHSL()
		{
			var r = this.red / 255, g = this.green / 255, b = this.blue / 255, v, m, vm;
			var r2, g2, b2;
	
			var h = 0; // default to black
			var s = 0;
			var l = 0;
	
			v = Math.max(r, g, b);
			m = Math.min(r, g, b);
	
			l = (m + v) / 2;
	
			if (l <= 0)
			{
				return [h * 360, s * 100, l * 100];
			}
	
			vm = v - m;
			s = vm;
	
			if (s > 0)
			{
				s /= (l <= 0.5) ? (v + m) : (2 - v - m);
			}
			else
			{
				return [h * 360, s * 100, l * 100];
			}
	
			r2 = (v - r) / vm;
			g2 = (v - g) / vm;
			b2 = (v - b) / vm;
	
			if (r == v)
			{
				h = (g == m ? 5 + b2 : 1 - g2);
			}
			else if (g == v)
			{
				h = (b == m ? 1 + r2 : 3 - b2);
			}
			else
			{
				h = (r == m ? 3 + g2 : 5 - r2);
			}
	
			h /= 6;
	
			if(h === 1)
			{
				h = 0;
			}
	
			return [h * 360, s * 100, l * 100];
		}

		getHue()
		{
			return this.toHSL()[0];
		}

		getSaturation()
		{
			return this.toHSL()[1];
		}

		getLightness()
		{
			return this.toHSL()[2];
		}
	
		// SET HSL
		fromHSL(h, s, l, a)
		{
			var r, g, b;
	
			h /= 360;
			s /= 100;
			l /= 100;
	
			var f = function(m1, m2, h)
			{
				if (h < 0)
				{
					h = h + 1;
				}
	
				if (h > 1)
				{
					h = h - 1;
				}
	
				if (h * 6 < 1)
				{
					return m1 + (m2 - m1) * h * 6;
				}
	
				if (h * 2 < 1)
				{
					return m2;
				}
	
				if (h * 3 < 2)
				{
					return m1 + (m2 - m1) * (2 / 3 - h) * 6;
				}
	
				return m1;
			};
	
			s = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
	
			l = l * 2 - s;
	
			a = a + '';
	
			this.red	= f(l, s, h + 1 / 3) * 255;
			this.green	= f(l, s, h) * 255;
			this.blue	= f(l, s, h - 1 / 3) * 255;
			this.alpha	= a ? (a.indexOf('%') > -1 ? EraMath.toInt(a) * 2.55 : EraMath.toFloat(a)) : 1;
		}

		setHue(hue)
		{
			hue = EraMath.bound(EraMath.toFloat(hue), 0, 360);
	
			var hsl = this.toHSL();
	
			this.fromHSL(hue, hsl[1], hsl[2], this.alpha);
	
			hsl = null;
		}

		setSaturation(saturation)
		{
			saturation = EraMath.bound(EraMath.toFloat(saturation), 0, 100);
	
			var hsl = this.toHSL();
	
			this.fromHSL(hsl[0], saturation, hsl[2], this.alpha);
	
			hsl = null;
		}

		setLightness(light)
		{
			light = EraMath.bound(EraMath.toFloat(light), 0, 100);
	
			var hsl = this.toHSL();
	
			this.fromHSL(hsl[0], hsl[1], light, this.alpha);
	
			hsl = null;
		}
	
		// SET HSV
		fromHSV(h, s, v, a)
		{
			h = h % 360;
			s /= 100;
			v /= 100;
	
			var r, g, b;
	
			if (s === 0)
			{
				r = g = b = v;
			}
			else
			{
				h /= 60; // sector 0 to 5
	
				var i = Math.floor(h),
				f = h - i, // factorial part of h
				p = v * (1 - s),
				q = v * (1 - s * f),
				t = v * (1 - s * (1 - f));
	
	
				switch (i)
				{
					case 0:
	
						r = v;
						g = t;
						b = p;
	
						break;
					case 1:
	
						r = q;
						g = v;
						b = p;
	
						break;
					case 2:
	
						r = p;
						g = v;
						b = t;
	
						break;
					case 3:
	
						r = p;
						g = q;
						b = v;
	
						break;
					case 4:
	
						r = t;
						g = p;
						b = v;
	
						break;
					default: // case 5:
	
						r = v;
						g = p;
						b = q;
				}
			}
	
			r *= 255;
			g *= 255;
			b *= 255;
	
			a = a ? (a.indexOf('%') > -1 ? EraMath.toInt(a) * 2.55 : EraMath.toFloat(a)) : 1;

			this.red	= Math.round(EraMath.bound((!isNaN(r) ? r : 255), 0, 255));
			this.green	= Math.round(EraMath.bound((!isNaN(g) ? g : 255), 0, 255));
			this.blue	= Math.round(EraMath.bound((!isNaN(b) ? b : 255), 0, 255));
			this.alpha	= EraMath.bound((!isNaN(a) ? a : 1), 0, 1);
		}
	
		// GET HSV
		toHSV()
		{
			var red = this.red,
				green = this.green,
				blue = this.blue,
	
			max = Math.max(red, green, blue),
			min = Math.min(red, green, blue),
			hue,
			saturation,
			value = max;
	
			if (min == max)
			{
				hue = 0;
				saturation = 0;
			}
			else
			{
				var delta = (max - min);
	
				saturation = delta / max;
	
				if (red == max)
				{
					hue = (green - blue) / delta;
				}
				else if (green == max)
				{
					hue = 2 + ((blue - red) / delta);
				}
				else
				{
					hue = 4 + ((red - green) / delta);
				}
	
				hue /= 6;
	
				if (hue < 0)
				{
					hue += 1;
				}
	
				if (hue > 1)
				{
					hue -= 1;
				}
			}
	
			return [hue * 360, saturation * 100, value / 255 * 100];
		}
	
		getYIQ(dark, light)
		{
			var yiq = ((this.red * 299) + (this.green * 587) + (this.blue * 114)) / 1000;
	
			if(Era.is(dark))
			{
				return (yiq >= 128) ? dark : light;
			}
	
			return yiq;
		}
	
		alphaBlending(bgColor)
		{
			bgColor = new EraColor(bgColor);
	
			return new EraColor([
				(1 - this.alpha) * bgColor.red + this.alpha * this.red,
				(1 - this.alpha) * bgColor.green + this.alpha * this.green,
				(1 - this.alpha) * bgColor.blue + this.alpha * this.blue,
				Math.max(bgColor.alpha, this.alpha) + (Math.min(bgColor.alpha, this.alpha) / 2)
			]);
		}
	
		toString()
		{
			return this.hex();
		}

		toInt()
		{
			return parseInt(this.hex().replace('#', ''), 16);
		}
	
		filter(name, arg, arg1, arg2)
		{
			if(window.EraColorFilters && (name in EraColorFilters))
			{
				if(EraColor.isColor(arg))
				{
					var col = new EraColor(arg);
	
					arg		= col.red;
					arg1	= col.green;
					arg2	= col.blue;
				}
	
				var res = EraColorFilters[name].call(this, this.red, this.green, this.blue, arg, arg1, arg2);
	
				res[3] = this.alpha;
	
				return new EraColor(res);
			}
	
			return new EraColor(this);
		}
		
		static random(alpha)
		{
			return new EraColor([
				EraMath.rand(0, 255),
				EraMath.rand(0, 255),
				EraMath.rand(0, 255),
				(alpha ? Math.random() : 1)
			]);
		};
		
		static hex(color)
		{
			return (new EraColor(color)).hex();
		}
		
		static isColor(s)
		{
			return ((s instanceof EraColor) || s.match(/((rgb|rgba|hsl|hsla|cmyk|cmyka)\([0-9]%?,[\s]*[0-9]+%?,[\s]*[0-9]+%?(,[\s]*[0-9\.]+)?\)|#[0-9A-F]{3,8})/gi));
		}
		
		static getImageAvgColors(options)
		{
			var $target	= I(options.target);
			var url		= options.url;
		
			if($target)
			{
				url = $target.src ||$target.href;
			}
		
			var load = function($img)
			{
				var minLuma		= (options.minLuma || 0) * 255 * 3, // How dark is too dark for a pixel
					maxLuma		= (options.maxLuma || 1) * 255 * 3, // How light is too light for a pixel
					minAlpha	= (options.minAlpha || 0) * 255, // How transparent is too transparent for a pixel
					maxWidth	= Era.is(options.maxWidth) ? options.maxWidth : 320,
		
					w = $img.width,
					h = $img.height,
		
					gr = 0, gg = 0, gb = 0, ga = 0,
					tr = 0, tg = 0, tb = 0, ta = 0,
					br = 0, bg = 0, bb = 0, ba = 0,
					lr = 0, lg = 0, lb = 0, la = 0,
					rr = 0, rg = 0, rb = 0, ra = 0,
					ar = 0, ag = 0, ab = 0, aa = 0,
					processedPixels = 0,
					processedPixelsT = 0,
					processedPixelsB = 0,
					processedPixelsL = 0,
					processedPixelsR = 0,
					luma = 0;
		
				if(!w || !h)
				{
					var s = $img.ajSize();
		
					w = s.width;
					h = s.height;
				}
		
				if(maxWidth)
				{
					var r = w / h;
		
					if(w > maxWidth)
					{
						w = maxWidth;
						h = w / r;
					}
		
					if(h > maxWidth)
					{
						h = maxWidth;
						w = h * r;
					}
				}
		
				var ctx = N(['canvas', {width: w, height: h}]).getContext('2d');
		
				ctx.drawImage($img, 0, 0, w, h);
		
				// Extract the rgba data for the image from the canvas
				var subpixels = ctx.getImageData(0, 0, w, h).data,
					len = w * h,
					hlen = len / 2,
					hwidth = w / 2;
		
		
				// Complete
				for (var i = 0; i < len; i++)
				{
					var j = i * 4;
		
					ar = subpixels[j];
					ag = subpixels[j + 1];
					ab = subpixels[j + 2];
					aa = subpixels[j + 3];
		
					luma = (ar + ag + ab);
		
					if (aa >= minAlpha && luma >= minLuma && luma <= maxLuma)
					{
						gr += ar;
						gg += ag;
						gb += ab;
						ga += aa;
						processedPixels++;
		
						if(i < hlen)
						{
							tr += ar;
							tg += ag;
							tb += ab;
							ta += aa;
							processedPixelsT++;
						}
						else
						{
							br += ar;
							bg += ag;
							bb += ab;
							ba += aa;
							processedPixelsB++;
						}
		
						var x = i % w;
		
						if(x < hwidth)
						{
							lr += ar;
							lg += ag;
							lb += ab;
							la += aa;
							processedPixelsL++;
						}
						else
						{
							rr += ar;
							rg += ag;
							rb += ab;
							ra += aa;
							processedPixelsR++;
						}
					}
				}
		
				var eColor = new EraColor(),
					color = (processedPixels > 0) ? new EraColor({
						red: gr / processedPixels,
						green: gg / processedPixels,
						blue: gb / processedPixels,
						alpha: (ga / processedPixels) / 255
					}) : eColor,
					colorT = (processedPixelsT > 0) ? new EraColor({
						red: tr / processedPixelsT,
						green: tg / processedPixelsT,
						blue: tb / processedPixelsT,
						alpha: (ta / processedPixelsT) / 255
					}) : eColor,
					colorB = (processedPixelsB > 0) ? new EraColor({
						red: br / processedPixelsB,
						green: bg / processedPixelsB,
						blue: bb / processedPixelsB,
						alpha: (ba / processedPixelsB) / 255
					}) : eColor,
					colorL = (processedPixelsL > 0) ? new EraColor({
						red: lr / processedPixelsL,
						green: lg / processedPixelsL,
						blue: lb / processedPixelsL,
						alpha: (la / processedPixelsL) / 255
					}) : eColor,
					colorR = (processedPixelsR > 0) ? new EraColor({
						red: rr / processedPixelsR,
						green: rg / processedPixelsR,
						blue: rb / processedPixelsR,
						alpha: (ra / processedPixelsR) / 255
					}) : eColor;
		
				options.callback && options.callback(color, colorT, colorR, colorB, colorL);
			};
		
			if($target && options.preloaded)
			{
				load($target);
			}
			else
			{
				var $img = new Image();
				$img.onload = function()
				{
					this.onload = null;
		
					load(this);
		
					$img = null;
				};
				$img.src = url;
			}
		}
	}
	
	EraColor.names = {
		transparent: '#00000000',
		Jiki: '#009999',
		AliceBlue: '#F0F8FF',
		AntiqueWhite: '#FAEBD7',
		Aqua: '#00FFFF',
		Aquamarine: '#7FFFD4',
		Azure: '#F0FFFF',
		Beige: '#F5F5DC',
		Bisque: '#FFE4C4',
		Black: '#000000',
		BlanchedAlmond: '#FFEBCD',
		Blue: '#0000FF',
		BlueViolet: '#8A2BE2',
		Brown: '#A52A2A',
		BurlyWood: '#DEB887',
		CadetBlue: '#5F9EA0',
		Chartreuse: '#7FFF00',
		Chocolate: '#D2691E',
		Coral: '#FF7F50',
		CornflowerBlue: '#6495ED',
		Cornsilk: '#FFF8DC',
		Crimson: '#DC143C',
		Cyan: '#00FFFF',
		DarkBlue: '#00008B',
		DarkCyan: '#008B8B',
		DarkGoldenRod: '#B8860B',
		DarkGray: '#A9A9A9',
		DarkGrey: '#A9A9A9',
		DarkGreen: '#006400',
		DarkKhaki: '#BDB76B',
		DarkMagenta: '#8B008B',
		DarkOliveGreen: '#556B2F',
		Darkorange: '#FF8C00',
		DarkOrchid: '#9932CC',
		DarkRed: '#8B0000',
		DarkSalmon: '#E9967A',
		DarkSeaGreen: '#8FBC8F',
		DarkSlateBlue: '#483D8B',
		DarkSlateGray: '#2F4F4F',
		DarkSlateGrey: '#2F4F4F',
		DarkTurquoise: '#00CED1',
		DarkViolet: '#9400D3',
		DeepPink: '#FF1493',
		DeepSkyBlue: '#00BFFF',
		DimGray: '#696969',
		DimGrey: '#696969',
		DodgerBlue: '#1E90FF',
		FireBrick: '#B22222',
		FloralWhite: '#FFFAF0',
		ForestGreen: '#228B22',
		Fuchsia: '#FF00FF',
		Gainsboro: '#DCDCDC',
		GhostWhite: '#F8F8FF',
		Gold: '#FFD700',
		GoldenRod: '#DAA520',
		Gray: '#808080',
		Grey: '#808080',
		Green: '#008000',
		GreenYellow: '#ADFF2F',
		HoneyDew: '#F0FFF0',
		HotPink: '#FF69B4',
		IndianRed: '#CD5C5C',
		Indigo: '#4B0082',
		Ivory: '#FFFFF0',
		Khaki: '#F0E68C',
		Lavender: '#E6E6FA',
		LavenderBlush: '#FFF0F5',
		LawnGreen: '#7CFC00',
		LemonChiffon: '#FFFACD',
		LightBlue: '#ADD8E6',
		LightCoral: '#F08080',
		LightCyan: '#E0FFFF',
		LightGoldenRodYellow: '#FAFAD2',
		LightGray: '#D3D3D3',
		LightGrey: '#D3D3D3',
		LightGreen: '#90EE90',
		LightPink: '#FFB6C1',
		LightSalmon: '#FFA07A',
		LightSeaGreen: '#20B2AA',
		LightSkyBlue: '#87CEFA',
		LightSlateGray: '#778899',
		LightSlateGrey: '#778899',
		LightSteelBlue: '#B0C4DE',
		LightYellow: '#FFFFE0',
		Lime: '#00FF00',
		LimeGreen: '#32CD32',
		Linen: '#FAF0E6',
		Magenta: '#FF00FF',
		Maroon: '#800000',
		MediumAquaMarine: '#66CDAA',
		MediumBlue: '#0000CD',
		MediumOrchid: '#BA55D3',
		MediumPurple: '#9370D8',
		MediumSeaGreen: '#3CB371',
		MediumSlateBlue: '#7B68EE',
		MediumSpringGreen: '#00FA9A',
		MediumTurquoise: '#48D1CC',
		MediumVioletRed: '#C71585',
		MidnightBlue: '#191970',
		MintCream: '#F5FFFA',
		MistyRose: '#FFE4E1',
		Moccasin: '#FFE4B5',
		NavajoWhite: '#FFDEAD',
		Navy: '#000080',
		OldLace: '#FDF5E6',
		Olive: '#808000',
		OliveDrab: '#6B8E23',
		Orange: '#FFA500',
		OrangeRed: '#FF4500',
		Orchid: '#DA70D6',
		PaleGoldenRod: '#EEE8AA',
		PaleGreen: '#98FB98',
		PaleTurquoise: '#AFEEEE',
		PaleVioletRed: '#D87093',
		PapayaWhip: '#FFEFD5',
		PeachPuff: '#FFDAB9',
		Peru: '#CD853F',
		Pink: '#FFC0CB',
		Plum: '#DDA0DD',
		PowderBlue: '#B0E0E6',
		Purple: '#800080',
		Red: '#FF0000',
		RosyBrown: '#BC8F8F',
		RoyalBlue: '#4169E1',
		SaddleBrown: '#8B4513',
		Salmon: '#FA8072',
		SandyBrown: '#F4A460',
		SeaGreen: '#2E8B57',
		SeaShell: '#FFF5EE',
		Sienna: '#A0522D',
		Silver: '#C0C0C0',
		SkyBlue: '#87CEEB',
		SlateBlue: '#6A5ACD',
		SlateGray: '#708090',
		SlateGrey: '#708090',
		Snow: '#FFFAFA',
		SpringGreen: '#00FF7F',
		SteelBlue: '#4682B4',
		Tan: '#D2B48C',
		Teal: '#008080',
		Thistle: '#D8BFD8',
		Tomato: '#FF6347',
		Turquoise: '#40E0D0',
		Violet: '#EE82EE',
		Wheat: '#F5DEB3',
		White: '#FFFFFF',
		WhiteSmoke: '#F5F5F5',
		Yellow: '#FFFF00',
		YellowGreen: '#9ACD32'
	};


	Era.S				= EraStrings;
	Era.N				= EraNumbers;
	Era.CSS				= EraCSS;
	Era.DelayManager	= EraDelayManager;
	Era.DOM				= EraDOM;
	Era.DOM.Observable	= EraDOMObservable;
	Era.FormData		= EraFormData;
	Era.DT				= EraDT;
	Era.I18N			= EraI18N;
	Era.Template		= EraTemplate;
	Era.Template.List	= EraTemplateList;
	Era.Event			= EraEvent;
	Era.Env				= EraEnv;
	Era.WS				= EraWebSocket;
	Era.Router			= EraRouter;
	//Era.Comp			= EraComponent;
	Era.Net				= EraNet;

	Era.Math			= EraMath;
	Era.Color			= EraColor;


	const $ = function()
	{
		return EraDOM.$.apply(EraDOM, arguments);
	};

	const $$ = function()
	{
		return EraDOM.$$.apply(EraDOM, arguments);
	};

	const N = function()
	{
		return EraDOM.nodeFrom.apply(EraDOM, arguments);
	};

	const _ = function()
	{
		if(arguments[0] instanceof Error)
		{
			return console.error.apply(console, arguments);	
		}

		return console.log.apply(console, arguments);
	};

	const L = function(key, lang)
	{
		return I18N.create(lang).get(key);
	};

	const css = function()
	{
		const args		= Array.from(arguments);
		const pieces	= args.shift();
		const res		= [];

		for(let i = 0, len = pieces.length, pLen = args.length; i < len; i++)
		{
			res.push(pieces[i]);

			if(i < pLen)
			{
				let arg = args[i];

				if(typeof arg == "function")
				{
					arg = arg(pieces, args);
				}

				res.push(arg);
			}
		}

		return res.join("");
	};

	const html = css;

	Era.init();

	return {
		Era,
		_,
		N,
		$,
		$$,
		L,
		html,
		css
	};

})(window, document);


////////////////////////////////////////////////////////////////////////////////////
// EraLoader

(function(Era, window, document)
{
	var ready = {},
		toExecute = {},
		$head = document.getElementsByTagName('head')[0];

	
	var $$scripts	= document.getElementsByTagName('script'),
		i			= $$scripts.length;

	while (i)
	{
		let $script = $$scripts[--i];

		if ($script)
		{
			let urlParts = ($script.src + '').split('/');

			var piece = urlParts.pop();

			if (piece && piece.match(/Era\.js/))
			{
				Era.baseUrl = urlParts.join('/');

				break;
			}
		}
	}
	$$scripts = null;

	class EraLoader
	{
		static single(url, cb)
		{
			if (toExecute[url])
			{
				if (cb)
				{
					if (ready[url])
					{
						cb();
					}
					else
					{
						toExecute[url].push(cb);
					}
				}
	
				return true;
			}
	
			toExecute[url] = [];
	
			cb && toExecute[url].push(cb); 

			if(url.match(/\.css(\?.*)?$/i))
			{
				var $link = document.createElement('link');
	
				$link.href		= url;
				$link.type		= 'text/css';
				$link.rel		= "stylesheet";
				$link.media		= 'all';
		
				$link.onload = $link.onreadystatechange = function(e)
				{
					if(!$link.readyState || /loaded|complete/.test($link.readyState))
					{
						if (!ready[url])
						{
							// MSIE memory leak
							$link.onload = $link.onreadystatechange = null;
							
							$link		= null;
							
							ready[url]	= true;
	
							for(var cb of toExecute[url])
							{
								cb();
							}
							
							if(window.DEBUG)
							{
								console.log(`%cLoaded %c${url}`, "color: #F00; font-size: 12px;", "color: #00F");
							}
							
							toExecute[url]	= [];
						}
					}
				};
		
				$head.appendChild($link);

				return;
			}
	
			var $script = document.createElement('script');
	
			$script.src		= url;
			$script.type	= 'text/javascript';
			$script.defer	= 'defer';
	
			$script.onload = $script.onreadystatechange = function(e)
			{
				if(!$script.readyState || /loaded|complete/.test($script.readyState))
				{
					if (!ready[url])
					{
						// MSIE memory leak
						$script.onload = $script.onreadystatechange = null;
	
						//$script.parentNode && $script.parentNode.removeChild($script);
						$script		= null;
						
						ready[url]	= true;

						for(var cb of toExecute[url])
						{
							cb();
						}
						
						console.log(`%cLoaded %c${url}`, "color: #F00; font-size: 12px;", "color: #00F");
						
						toExecute[url]	= [];
					}
				}
			};
	
			$head.appendChild($script);
		}

		static more(urls, cb)
		{
			if (!(urls instanceof Array))
			{
				throw new Error('"urls" parameter must be an Array');
			}

			var totalUrls = urls.length,
				i = 0;

			for(let url of urls)
			{
				this.single(url, () =>
				{
					if (++i >= totalUrls)
					{
						cb && cb.call(this, totalUrls);
					}
				});
			}
		}

		static required(url)
		{
			return !!toExecute[url];
		}

		static lib(library, cb)
		{
			if(typeof library == 'string')
			{
				library = library.split(',');
			}

			if (!(library instanceof Array))
			{
				throw new Error('"library" parameter must be an Array');
			}

			var res = [],
				thens = [],
				cbBkp = cb;

			var addRow = (row) =>
			{
				if(typeof row.pre == "function")
				{
					row.pre();
				}

				if(row.path)
				{
					res.push(Era.baseUrl + row.path);
				}
				else if(row.url)
				{
					res.push(row.url);
				}

				if(row.then)
				{
					thens = thens.concat(row.then);

					cb = function()
					{
						EraLoader.lib(thens, cbBkp);
					};
				}
			};

			for(let libName of library)
			{
				var known	= EraLoader.libraries[libName];

				if(known)
				{
					for(let row of known)
					{
						addRow(row);
					}
				}
				else
				{
					if(typeof libName == "object")
					{
						addRow(libName);
					}
					else
					{
						if(!libName.match(/\.(js|css)(\?.*)?$/))
						{
							libName += '.js';
						}

						res.push(Era.baseUrl + '/' + libName);
					}
					
				}
			}

			return this.more(res, cb);
		}
	}

	EraLoader.libraries = {
		anime: [{path: '/thirdy/anime.min.js'}],
		axios: [{path: '/thirdy/axios.min.js'}],
		leaflet: [
			{path: "/thirdy/leaflet/leaflet.css"},
			{path: '/thirdy/leaflet/leaflet.js',
				then: [
					{path: "/thirdy/leaflet/plugins/Control.Geocoder.css"},
					{path: '/thirdy/leaflet/plugins/Control.Geocoder.js'}
				]	
			},
		],
		flatpickr: [
			{url: "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"},
			{url: "https://cdn.jsdelivr.net/npm/flatpickr"}
		],
		simplebar: [
			{url: "https://unpkg.com/simplebar@latest/dist/simplebar.css"},
			{url: "https://unpkg.com/simplebar@latest/dist/simplebar.js"}
		],
		dayjs: [{path: '/thirdy/dayjs/dayjs.min.js'}, {path: '/thirdy/dayjs/locale/it.js'}],
		//moment: [{path: '/thirdy/moment-with-locales.min.js'}],
		plupload: [{path: '/thirdy/plupload.full.min.js'}],
		sortable: [{path: '/thirdy/Sortable.min.js'}],
		zingtouch: [{path: '/thirdy/zingtouch.min.js'}],
		//fineuploader: [{path: '/thirdy/fine-uploader.min.js'}],
		three: [{path: '/thirdy/three.min.js'}],
		eqcss: [{path: '/thirdy/EQCSS.min.js'}],
		chartjs: [{path: '/thirdy/Chart.bundle.min.js'}],
		ace: [{path: '/thirdy/ace/ace.js'}],
		highlight: [{path: '/thirdy/highlight/highlight.pack.js'}],
		//codemirror: [{path: '/thirdy/codemirror.js'}],
		vibrant: [{path: '/thirdy/Vibrant.min.js'}],
		formatter: [{path: '/thirdy/formatter.min.js'}],
		videojs: [{url: 'https://vjs.zencdn.net/7.3.0/video-js.css'}, {url: 'https://vjs.zencdn.net/7.3.0/video.js'}],
		plyr: [{url: 'https://cdn.plyr.io/3.5.4/plyr.css'}, {url: 'https://cdn.plyr.io/3.5.4/plyr.js'}],
		ckeditor: [{url: '//cdn.ckeditor.com/ckeditor5/11.0.0/classic/ckeditor.js'}],
		ckeditor4: [{url: '//cdn.ckeditor.com/4.10.1/full-all/ckeditor.js'}],
		tinymce: [{url: 'https://cloud.tinymce.com/stable/tinymce.min.js'}],
		choicesjs: [{path: "/thirdy/choicesjs/choices.min.js"}, {path: "/thirdy/choicesjs/choices.min.css"}],
		grapejs: [{path: "/thirdy/grapejs/grapes.min.js"}, {path: "/thirdy/grapejs/css/grapes.min.css"}],
		grapejswebpage: [{path: "/thirdy/grapejs/grapesjs-preset-webpage.min.js"}, {path: "/thirdy/grapejs/grapesjs-preset-webpage.min.css"}],
		// https://github.com/sachinchoolur/lightgallery.js
		lightgallery: [
			{path: "/thirdy/lightgallery/css/lightgallery.min.css"},
			{path: "/thirdy/lightgallery/css/lg-transitions.min.css"},
			{path: "/thirdy/lightgallery/js/lightgallery.min.js",
				then: [
					{path: "/thirdy/lightgallery/js/lg-video.min.js"},
					{path: "/thirdy/lightgallery/js/lg-thumbnail.min.js"}
				]
			},
		]
	};

	Era.Loader = EraLoader;

})(Era, window, document);

(function()
{
	console.log("%cEra is ready", "color: #F00; font-size: 20px;");

})();