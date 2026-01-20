// This JS file is in order to support css animation for the website
// This file does not have any dependencies; without this file, the send button can't work,
// because the event listener is in this file!

//-----------------Input Box Animation-----------------
document.getElementById("msg-input").addEventListener("focus", function () {
  document.getElementById("input-box").classList.add("ipt-box-focus");
});

document.getElementById("msg-input").addEventListener("blur", function () {
  document.getElementById("input-box").classList.remove("ipt-box-focus");
});
//----------------- End -----------------

//-----------------Send Button Animation-----------------
// The send button animation function: showError, are used in client.js
// Without this file, the send button will still function properly,
// but user can't check if the message send is error not

function showError(){
  removeAllToggles();
  document.getElementById("send-img").src = preloadedImages["error"];
  document.getElementById("send-img").classList.toggle("error");
  setTimeout(() => {
    document.getElementById("send-img").classList.remove("error");
    document.getElementById("send-img").classList.toggle("remove-error");
    setTimeout(() => {
      document.getElementById("send-img").src = preloadedImages["arrowUp"];
      document.getElementById("send-img").classList.remove("remove-error");
      document.getElementById("send-img").classList.toggle("load");
      document.getElementById("send-btn").disabled = false;
    },500);
  },1500);
}

function sendSuccess(){
  removeAllToggles();
  document.getElementById("send-img").classList.remove("loading");
  document.getElementById("send-img").classList.toggle("remove-loading");
  setTimeout(() => {
    document.getElementById("send-img").src = preloadedImages["success"];
    document.getElementById("send-img").classList.remove("remove-loading");
    document.getElementById("send-img").classList.toggle("success");
    setTimeout(() => {
      document.getElementById("send-img").src = preloadedImages["arrowUp"];
      setTimeout(() => {
        document.getElementById("send-img").classList.remove("success");
        document.getElementById("send-img").classList.remove("load");
        document.getElementById("send-img").classList.toggle("load");
        document.getElementById("send-btn").disabled = false;
      },100);
    },1500);
  },1000);
}

document.getElementById("send-btn").addEventListener("click", function(e) {
  if(document.getElementById("send-btn").disabled){
    throw new Error('Too many clicks!');
  }
  document.getElementById("send-btn").disabled = true;
  sendMsg(document.getElementById("msg-input").value).then(() => {
    document.getElementById("send-img").classList.toggle("active");
    setTimeout(() => {
      if(status === "free"){
        return;
      }
      document.getElementById("send-img").src = preloadedImages["loading"];
      document.getElementById("send-img").classList.toggle("load");
      document.getElementById("send-img").classList.remove("active");
    }, 500);
    setTimeout(() => {
      if(status === "free"){
        return;
      }
      document.getElementById("send-img").classList.remove("load");
      document.getElementById("send-img").src = preloadedImages["loading"];
      document.getElementById("send-img").classList.toggle("loading");
    }, 1000);
  }).catch((e) => {
    console.log(e);
    showError();
  });
});
//----------------- End -----------------

//----------------- textarea height control -----------------

document.getElementById("msg-input").addEventListener("keyup", function (e) {
  console.log(e.target.classList.value.indexOf("newline"));
  if (
    e.target.value.indexOf("\n") !== -1 &&
    e.target.classList.value.indexOf("newline") === -1
  ) {
    e.target.classList.toggle("newline");
    document.getElementById("input-box").classList.toggle("newline");
  } else if (e.target.value.indexOf("\n") === -1) {
    e.target.classList.remove("newline");
    document.getElementById("input-box").classList.remove("newline");
  }
});

//----------------- End -----------------

//------- mobile keyboard resize ---------

function moblieResize() {
    const vh = window.visualViewport.height * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
    window.scrollTo({
      top: window.top,
      behavior: "smooth",
    });
}
window.addEventListener("resize", moblieResize);

document.addEventListener(
  "DOMFocusIn",
  function (event) {
    if (!event.target) {
      return;
    }
    var is_target = false;
    for (var i = 0; i < focuscheck_type.length; i++) {
      if (event.target.type === focuscheck_type[i]) {
        is_target = true;
        break;
      }
    }
    if (!is_target) {
      return;
    }

    //キーボードが出現した時の処理
    moblieResize();
  },
  false
);

document.addEventListener("DOMFocusOut", function() {
    //キーボードが引っ込んだ時
    moblieResize();
}, false);

// Initial set
const vh = window.visualViewport.height * 0.01;
document.documentElement.style.setProperty("--vh", `${vh}px`);

visualViewport.addEventListener("resize", (e) => {
  const windowHeight = window.innerHeight;
  const visualWindowHeight = e.target.height;

  const keyboardHeight = windowHeight - visualWindowHeight;
  console.log(keyboardHeight);
  moblieResize();
});

//----------------- End -----------------

function removeAllToggles() {
  const toggles = [
    "load",
    "error",
    "success",
    "remove-loading",
    "remove-error",
    "active",
    "loading",
  ];

  for (let i = 0; i < toggles.length; i++) {
    document.getElementById("send-img").classList.remove(toggles[i]);
  }
}
