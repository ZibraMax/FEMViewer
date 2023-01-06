class NotificationBar {
	static defaultConfig = { defaultMessage: "Ready! ", defaultTimeout: 1500 };
	constructor(parent, config) {
		console.log("Blocones!");
		this.buttons = [];
		this.parent = parent;
		this.config = { ...NotificationBar.defaultConfig, ...config };
		this.defaultMessage = this.config["defaultMessage"];
		this.defaultTimeout = this.config["defaultTimeout"];
		this.createView();
	}

	createView() {
		const notification_container = document.createElement("div");
		notification_container.setAttribute("id", "notification-container");
		notification_container.setAttribute(
			"class",
			"notification-container noselect"
		);
		this.container = document.createElement("div");
		this.container.setAttribute("class", "notification-bottom");

		this.status_text = document.createElement("p");
		this.status_text.setAttribute("id", "status-bar");
		this.status_text.setAttribute("class", "notification-buttom noselect");
		this.status_text.setAttribute("style", "float: left");
		this.status_text.innerHTML = "Ready!";

		this.container.appendChild(this.status_text);
		notification_container.appendChild(this.container);
		this.parent.appendChild(notification_container);
	}
	addButton(iconClass, onclickAction) {
		const btn_container = document.createElement("p");
		btn_container.setAttribute("class", "notification-button");
		const btn = document.createElement("button");
		btn.setAttribute("class", iconClass + " notification-action");
		btn.setAttribute("class", iconClass + " notification-action");
		btn_container.appendChild(btn);
		this.container.appendChild(btn_container);
		this.buttons.push(btn);
		btn.addEventListener("click", onclickAction);
		return btn;
	}
	sendMessage(msg, timeout) {
		if (!timeout) {
			timeout = this.defaultTimeout;
		}
		this.status_text.innerHTML = msg;
		setTimeout(() => {
			this.status_text.innerHTML = this.defaultMessage;
		}, timeout);
	}
	setMessage(msg, prevent) {
		this.status_text.innerHTML = msg;
		if (!prevent) {
		}
	}
	resetMessage() {
		this.status_text.innerHTML = this.defaultMessage;
	}
	setProgressBar(msg, percentage) {
		const pb =
			'<progress value="' + percentage + '" max="100"> any% </progress>';
		this.status_text.innerHTML = msg + " " + pb;
	}
}
export { NotificationBar };
