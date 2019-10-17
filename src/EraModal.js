(function()
{
	class EraModal
	{
		constructor(opts = {})
		{
			opts = Object.assign({}, opts);

			this.el$ = $(/*html*/`
				<div class="era-modal">
					<div class="era-modal-bg"></div>
					<div class="era-modal-wrp">
						<div class="era-modal-cnt">
							<div class="era-modal-head"></div>
							<div class="era-modal-body"></div>
							<div class="era-modal-foot"></div>
						</div>
					</div>
				</div>
			`);

			if(opts.className)
			{
				this.el$.addCls(opts.className);
			}

			if(opts.maxWidth)
			{
				this.getCnt().css({
					maxWidth: opts.maxWidth
				});
			}

			if(opts.head)
			{
				this.setHeadContent(opts.head);
			}

			if(opts.body)
			{
				this.setBodyContent(opts.body);
			}

			if(opts.foot)
			{
				this.setFootContent(opts.foot);
			}

			if(opts.buttons)
			{
				let buttons = opts.buttons.map((row) =>
				{
					return N(['div', {
						cls: ["button", row.cls],
						click: row.click ? row.click.bind(this) : () => {}
					}, row.label || ""]);
				});

				this.addFootContent(buttons);
			}

			if(opts.clickBackground)
			{
				const clickBg = opts.clickBackground.bind(this);

				this.getWrp().on("click", function(e)
				{
					if(e.target == this.firstNode())
					{
						clickBg(e);
					}
				});
			}

			EraModal.addStyle();

			$(document.body).append(this.el$);
		}

		close()
		{
			this.el$.remove();
		}

		getBg()
		{
			return this.el$.$('.era-modal-bg')
		}

		getWrp()
		{
			return this.el$.$('.era-modal-wrp')
		}

		getCnt()
		{
			return this.el$.$('.era-modal-cnt')
		}

		getHead()
		{
			return this.el$.$('.era-modal-head')
		}

		getBody()
		{
			return this.el$.$('.era-modal-body')
		}

		getFoot()
		{
			return this.el$.$('.era-modal-foot')
		}

		setHeadContent(cnt)
		{
			this.getHead().replace(cnt);
		}

		setBodyContent(cnt)
		{
			this.getBody().replace(cnt);
		}

		setFootContent(cnt)
		{
			this.getFoot().replace(cnt);
		}

		addFootContent(cnt)
		{
			this.getFoot().append(cnt);
		}

		static create(opts = {})
		{
			return new EraModal(opts);
		}

		static confirm(opts = {}, cb = null)
		{
			if(typeof opts == "string")
			{
				opts = {title: "Confirmation required", message: opts};
			}

			const onCancel = function()
			{
				const res = opts.cancel ? opts.cancel.call(this) : true;

				if(res === true)
				{
					this.close();
				}
			};

			const onConfirm = cb || opts.confirm;

			opts = Object.assign(opts, {
				head: opts.title ? `<h3>${opts.title}</h3>` : opts.head,
				body: opts.message ? `<p>${opts.message}</p>` : opts.body,
				clickBackground: onCancel,
				buttons: (opts.buttons || []).concat([{
					cls: "secondary",
					label: opts.cancelLabel || "Cancel",
					click: onCancel
				}, {
					label: opts.confirmLabel || "Confirm",
					click: function()
					{
						const res = onConfirm ? onConfirm.call(this) : false;
		
						if(res === true)
						{
							this.close();
						}
					}
				}])
			});

			return new EraModal(opts);
		}

		static alert(opts = {}, cb = null)
		{
			if(typeof opts == "string")
			{
				opts = {title: "Alert", message: opts};
			}

			const onConfirm = cb || opts.confirm;

			opts = Object.assign(opts, {
				head: opts.title ? `<h3>${opts.title}</h3>` : opts.head,
				body: opts.message ? `<p>${opts.message}</p>` : opts.body,
				clickBackground: onConfirm,
				buttons: (opts.buttons || []).concat([{
					label: opts.confirmLabel || "OK",
					click: function()
					{
						const res = onConfirm ? onConfirm.call(this) : true;
		
						if(res === true)
						{
							this.close();
						}
					}
				}])
			});

			return new EraModal(opts);
		}

		static addStyle()
		{
			if(this._styleAdded)
			{
				return;
			}

			Era.CSS.addStyle(css`
				.era-modal {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					z-index: 500;
				}	
				.era-modal-bg {
					background-color: rgba(0, 0, 0, 0.5);
					width: 100%;
					height: 100%;
					position: fixed;
				}
				.era-modal-wrp {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
					position: fixed;
					padding: 1em;
				}
				.era-modal-cnt {
					display: flex;
					flex-direction: column;
					background: var(--bg-color);
					box-shadow: 0em 1em 3em var(--shadow-color);
					border-radius: var(--border-radius);
				}
				.era-modal-head:empty,
				.era-modal-body:empty,
				.era-modal-foot:empty {
					display: none;
				}

				.era-modal-head {
					border-bottom: 1px solid var(--light-border-color);
					padding: 0.62em 1em;
				}
				.era-modal-head h3 {
					margin: 0;
				}
				.era-modal-body {
					padding: 0.62em 1em;
					overflow: auto;
				}
				.era-modal-body:empty {
					display: none;
				}
				.era-modal-foot {
					border-top: 1px solid var(--light-border-color);
					padding: 0.62em 1em;
					text-align: right;
				}
				.era-modal-body:empty + .era-modal-foot {
					border-top: none;
				}
				.era-modal-foot .button {
					margin-left: 1em;
				}
			`);

			this._styleAdded = true;
		}
	}

	Era.Modal = EraModal;

})();