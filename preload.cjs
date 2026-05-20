const { contextBridge, ipcRenderer } = require("electron");

console.log("preload.js loading");
global.ipcRenderer = ipcRenderer;
global.msg = "Hello Global";

contextBridge.exposeInMainWorld("electron", {
  showContextMenu: (params) => ipcRenderer.send("show-context-menu", params),
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  getWebviewActions: async () => ipcRenderer.invoke("get-webview-actions"),
  moviesmod_script: `
    function clickElement() {
      while(counter>0){
        let XpathsCollection = document.querySelectorAll(".maxbutton-download-links");
        console.log(XpathsCollection);
        var open_link_e = Array.from(XpathsCollection).find((element) => {
          let text = element.parentNode.previousElementSibling.innerText;
          if (text != undefined && text.includes("720p")) {
            return true;
          }
          return false;
        });
        if (open_link_e) {
          openNewTab(open_link_e.href,electron.links_modpro_script);
          counter=0;
          console.log("Element found and clicked");
          break;
        } else {
          console.log("Element not found, retrying...");
          counter--;
        }
      }
    }
    clickElement();
    sleep(10000);

  `,
  links_modpro_script: `
        let server_x = "/html/body/div[1]/div/div/div/div/div/main/div/div/article/div/div[2]/div[2]/p[3]/a";
        let server_e = getElementByXpath(server_x);

        if (server_e) {
          openNewTab(server_e.href,electron.verification_script);
          console.log("Server link clicked and new tab opened");
        }
    `,
  verification_script: ` 
  console.log("Verification steps started");
  let ad_close_x = "/html/body/div/button/img";
    let ad_skip_x = "/html/body/div/div[4]/div[4]/button";
    let start_ver_x = "/html/body/section/main/div/form/span/a/h5";
    let cont_ver_x = "/html/body/section/article/span[2]";

    async function verification_func() {
      sleep(10000); // Sleep for 10 seconds
      let start_ver_e = getElementByXpath(start_ver_x);
      let ad_close_e = getElementByXpath(ad_close_x);
      let ad_skip_e = getElementByXpath(ad_skip_x);
      if (start_ver_e) {
        start_ver_e.click();
        console.log("Start verfication done");
      } else if (ad_close_e != undefined) {
        ad_close_e.click();
        console.log("Ad closed");
      } else if (ad_skip_e != undefined) {
        ad_skip_e.click();
        console.log("Ad skipped");
      }

      sleep(3000);
      let cont_ver_e = getElementByXpath(cont_ver_x);
      if (cont_ver_e) {
        cont_ver_e.click();
        console.log("Continue verfication done");
      } else if (ad_close_e != undefined) {
        ad_close_e.click();
        console.log("Ad closed");
      } else if (ad_skip_e != undefined) {
        ad_skip_e.click();
        console.log("Ad skipped");
      }
      
    }
    verification_func();
    await sleep(3000);
      let verify_btn = document.getElementById("verify_button");
      if (verify_btn) {
        verify_btn.click();
        console.log("Verify button clicked");
      }
      await sleep(10000);
      let two_steps_btn = document.getElementById("two_steps_btn");
      if (two_steps_btn) {
        // two_steps_btn.click();
        location.href = two_steps_btn.href;
        console.log("two_steps_btn");
      }`,
  continue_verification_script: `await sleep(3000);
      let verify_btn = document.getElementById("verify_button");
      if (verify_btn) {
        verify_btn.click();
        console.log("Verify button clicked");
      }
      await sleep(10000);
      let two_steps_btn = document.getElementById("two_steps_btn");
      if (two_steps_btn) {
        // two_steps_btn.click();
        location.href = two_steps_btn.href;
        console.log("two_steps_btn");
      }`,
});
