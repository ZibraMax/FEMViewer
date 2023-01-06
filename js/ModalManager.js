class Modal {
	constructor(container, header, footer) {
		this.container = container;
		this.header = header || "";
		this.footer = footer || "";
		this.createView();
		this.close();
		this.container.appendChild(this.root);
	}
	close() {
		this.root.style.display = "none";
	}
	show() {
		this.root.style.display = "table";
		window.onclick = function (event) {
			if (event.target == this.root) {
				this.close();
			}
		};
	}
	addContent(param) {
		this.content.appendChild(param);
	}
	createView() {
		let root = document.createElement("div");
		root.setAttribute("class", "mini-box-center resizable");
		this.content_container = document.createElement("div");
		this.content_container.setAttribute("class", "modal-content-container");
		this.content = document.createElement("div");
		this.content.setAttribute("class", "modal-content-view");
		let header = document.createElement("div");
		header.setAttribute(
			"class",
			"header-element-viewer noselect draggableModalManager"
		);
		header.innerHTML = this.header;

		if (this.footer) {
			let footer = document.createElement("div");
			footer.setAttribute("class", "notification-container-ev noselect");
			let footer2 = document.createElement("div");
			footer2.setAttribute("class", "notification-bottom-ev");
			this.infoText = document.createElement("p");
			this.infoText.setAttribute(
				"class",
				"notification-button-ev noselect"
			);
			this.infoText.innerHTML = this.footer;
			footer2.appendChild(this.infoText);
			footer.appendChild(footer2);
			this.content_container.appendChild(footer);
		}
		this.closeButton = document.createElement("i");
		this.closeButton.setAttribute("class", "closeButton fa-solid fa-xmark");
		this.closeButton.setAttribute(
			"style",
			"position:absolute;top: 4px;right: 8px;z-index:100"
		);
		this.closeButton.addEventListener("click", this.close.bind(this));

		this.content_container.appendChild(header);
		this.content_container.appendChild(this.content);

		root.appendChild(this.closeButton);
		root.appendChild(this.content_container);
		this.root = root;
		this.closeButton.onclick = this.close.bind(this);

		interact(".draggableModalManager").draggable({
			modifiers: [
				interact.modifiers.restrictRect({
					restriction: this.container,
				}),
			],
			listeners: {
				move: dragMoveListener,
			},
		});

		function dragMoveListener(event) {
			var target = event.target.parentElement.parentElement;
			var x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
			var y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;
			target.style.transform = "translate(" + x + "px, " + y + "px)";
			target.setAttribute("data-x", x);
			target.setAttribute("data-y", y);
		}
		interact(".resizable")
			.resizable({
				preserveAspectRatio: false,
				edges: { left: true, right: true, bottom: true, top: true },
			})
			.on("resizemove", function (event) {
				var target = event.target,
					x = parseFloat(target.getAttribute("data-x")) || 0,
					y = parseFloat(target.getAttribute("data-y")) || 0;
				target.style.width = event.rect.width + "px";
				target.style.height = event.rect.height + "px";
				x += event.deltaRect.left;
				y += event.deltaRect.top;
				target.style.webkitTransform = target.style.transform =
					"translate(" + x + "px," + y + "px)";
				target.setAttribute("data-x", x);
				target.setAttribute("data-y", y);
				window.dispatchEvent(new Event("resize"));
			});
	}
}
export { Modal };
