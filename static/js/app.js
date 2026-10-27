// ------------------------------
      // FRONTEND: estado e carregamento
      // ------------------------------
      let D = {
          products: [],
          warehouses: [],
          kits: [],
          movements: [],
          stock: [],
          expiryLots: [],
          categories: [],
          catalogs: { brands: [], suppliers: [] },
          outsourcing: [],
          outsourcingProducts: [],
          dynamicProducts: [],
          dynamicConnections: [],
          dynamicStock: [],
          dynamicMovements: [],
          supplierOrders: [],
          marketplaceConnections: [],
          apiConnections: [],
          marketplaceMappings: [],
          marketplaceEvents: [],
        },
        ready = false,
        activeApiConnection = "overview";
      const $ = (s) => document.querySelector(s),
        $$ = (s) => [...document.querySelectorAll(s)];
      const esc = (s) =>
        String(s ?? "").replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#039;",
            })[m],
        );
      async function apiFetch(url, options = {}) {
        const headers = { ...(options.headers || {}) };
        let r = await fetch(url, { ...options, headers, credentials: "same-origin", cache: options.cache || "no-store" });
        if (r.status === 401 && !url.startsWith("/api/auth/")) showAuthScreen();
        return r;
      }
      function showAuthScreen(message = "") { document.body.classList.add("auth-required"); const box = $("#authScreen"); if (box) box.hidden = false; if ($("#authMessage")) $("#authMessage").textContent = message; }
      function hideAuthScreen() { document.body.classList.remove("auth-required"); const box = $("#authScreen"); if (box) box.hidden = true; }
      let currentUser = null;
      const captchaState = { register: "" };
      function newCaptcha(kind) { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; captchaState[kind] = Array.from({length: 5}, () => chars[Math.floor(Math.random() * chars.length)]).join(""); const visual = $(`#${kind}CaptchaVisual`); if (visual) visual.textContent = captchaState[kind]; const input = $(`#${kind}CaptchaInput`); if (input) input.value = ""; }
      function validCaptcha(kind, value) { return String(value || "").trim().toUpperCase() === captchaState[kind]; }
      async function authStart() { currentUser = { id: "local-demo", email: "local@worker" }; hideAuthScreen(); return true; }
      async function logoutAccount() {
        const button = $("#logoutAccount");
        if (button) { button.disabled = true; button.textContent = "Saindo..."; }
        try {
          const r = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
          if (!r.ok) throw Error("Não foi possível sair da conta.");
          if ($("#loginForm")) { $("#loginForm").hidden = false; $("#firstAccountBox").hidden = false; }
          if ($("#registerForm")) $("#registerForm").hidden = true;
          if ($("#authTitle")) $("#authTitle").textContent = "Entrar na sua conta";
          if ($("#authIntro")) $("#authIntro").textContent = "Acesse seu espaço de trabalho.";
          currentUser = null;
          if ($("#authMessage")) $("#authMessage").textContent = "Você saiu da sua conta.";
          newCaptcha("login");
          showAuthScreen();
        } catch (error) {
          toast(error.message);
        } finally {
          if (button) { button.disabled = false; button.textContent = "Sair da conta"; }
        }
      }
      async function submitLogin(event) { event.preventDefault(); const f = new FormData(event.target); const email = String(f.get("email") || "").trim(); try { const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ email, password: f.get("password") }) }); const x = await r.json(); if (!r.ok) throw Error(x.error || "Não foi possível entrar."); currentUser = x.user || null; if ($("#rememberLogin").checked) localStorage.setItem("estoque_login_email", email); else localStorage.removeItem("estoque_login_email"); hideAuthScreen(); await loadAdd11Preferences(); await load(); } catch (error) { $("#authMessage").textContent = error.message; newCaptcha("login"); } }
      async function submitRegister(event) { event.preventDefault(); const f = new FormData(event.target); if (!validCaptcha("register", f.get("captcha"))) { $("#authMessage").textContent = "O código de verificação está incorreto."; newCaptcha("register"); return; } if (f.get("password") !== f.get("confirm")) return $("#authMessage").textContent = "As senhas não coincidem."; try { const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) }); const x = await r.json(); if (!r.ok) throw Error(x.error || "Não foi possível criar a conta."); currentUser = x.user || null; hideAuthScreen(); await loadAdd11Preferences(); await load(); } catch (error) { $("#authMessage").textContent = error.message; newCaptcha("register"); } }
      document.addEventListener("DOMContentLoaded", async () => { $("#loginForm")?.addEventListener("submit", submitLogin); $("#registerForm")?.addEventListener("submit", submitRegister); $("#refreshRegisterCaptcha")?.addEventListener("click", () => newCaptcha("register")); $("#showRegister")?.addEventListener("click", () => { $("#loginForm").hidden = true; $("#firstAccountBox").hidden = true; $("#registerForm").hidden = false; $("#authTitle").textContent = "Crie sua conta"; $("#authIntro").textContent = "Comece a organizar seu estoque."; newCaptcha("register"); }); $("#cancelRegister")?.addEventListener("click", () => { $("#registerForm").hidden = true; $("#loginForm").hidden = false; $("#firstAccountBox").hidden = false; $("#authTitle").textContent = "Entrar na sua conta"; $("#authIntro").textContent = "Acesse seu espaço de trabalho."; }); await authStart(); if (!document.body.classList.contains("auth-required")) { await loadAdd11Preferences(); load(); } });
      async function load() {
        try {
          const r = await apiFetch("/api/data");
          if (!r.ok) throw Error("Não foi possível carregar os dados.");
          const x = await r.json();
          const connectionResponse = await apiFetch(
            "/api/dynamic-product-connections",
          );
          const connectionData = connectionResponse.ok
            ? await connectionResponse.json()
            : { connections: [] };
          D = {
            products: Array.isArray(x.products) ? x.products : [],
            warehouses: Array.isArray(x.warehouses) ? x.warehouses : [],
            kits: Array.isArray(x.kits) ? x.kits : [],
            movements: Array.isArray(x.movements) ? x.movements : [],
            stock: Array.isArray(x.stock) ? x.stock : [],
            expiryLots: Array.isArray(x.expiry_lots) ? x.expiry_lots : [],
            categories: Array.isArray(x.categories) ? x.categories : [],
            catalogs: x.catalogs || { brands: [], suppliers: [] },
            outsourcing: Array.isArray(x.outsourcing) ? x.outsourcing : [],
            outsourcingProducts: Array.isArray(x.outsourcing_products)
              ? x.outsourcing_products
              : [],
            outsourcingProductStatus: x.outsourcing_product_status || {},
            dynamicProducts: Array.isArray(x.dynamic_products)
              ? x.dynamic_products
              : [],
            dynamicConnections: Array.isArray(connectionData.connections)
              ? connectionData.connections
              : [],
            dynamicStock: Array.isArray(x.dynamic_stock) ? x.dynamic_stock : [],
            dynamicMovements: Array.isArray(x.dynamic_movements)
              ? x.dynamic_movements
              : [],
            dynamicTasks: Array.isArray(x.dynamic_tasks) ? x.dynamic_tasks : [],
            dynamicPurchases: Array.isArray(x.dynamic_purchases) ? x.dynamic_purchases : [],
            outsourcingStock: Array.isArray(x.outsourcing_stock)
              ? x.outsourcing_stock
              : [],
            supplierOrders: Array.isArray(x.supplier_orders) ? x.supplier_orders : [],
            outsourcingMeta: x.outsourcing_product_meta || {},
            marketplaceConnections: Array.isArray(x.marketplace_connections) ? x.marketplace_connections : [],
            apiConnections: Array.isArray(x.api_connections) ? x.api_connections : [],
            marketplaceMappings: Array.isArray(x.marketplace_mappings) ? x.marketplace_mappings : [],
            marketplaceEvents: Array.isArray(x.marketplace_events) ? x.marketplace_events : [],
          };
          ready = true;
          fillSelects();
          bindRichProductPickers();
          bindExpandablePickerSelects();
          renderAll();
          if (selectedProductId && $("#productDetail")?.classList.contains("active")) renderProductDetail();
          ["entry", "exit", "transfer"].forEach((k) => {
            if (!$(`#${k}Lines`).children.length) addLine(k);
          });
          ["#entryForm input[name=date]", "#productEntryForm input[name=date]"].forEach((selector) => { const field = $(selector); if (field && !field.value) field.value = new Date().toISOString().slice(0, 10); });
        } catch (e) {
          toast(e.message);
        }
      }
      function catName(id) {
        return D.categories.find((c) => c.id === id)?.name || "";
      }
      function catChildren(id) {
        return D.categories.filter((c) => c.parent_id === id);
      }
      function categoryLabel(p) {
        return p.subcategory
          ? `${p.category || ""} / ${p.subcategory}`
          : p.category || "Sem categoria";
      }
      function productSuggestion(p) {
        const measures =
          p.length || p.width || p.height
            ? `Medidas ${p.length || 0} × ${p.width || 0} × ${p.height || 0}`
            : "Sem medidas";
        const type = p.ao ? "Onda Alta" : p.bo ? "Onda Baixa" : "Sem tipo";
        return `${p.sku} — ${p.name} — ${measures} — ${p.brand || "Sem marca"} — ${type}`;
      }
      function kitSuggestion(k) {
        return `${k.sku} — ${k.name} — KIT`;
      }
      function fillSelects() {
        if (!ready) return;
        const all = '<option value="all">Todos os estoques</option>';
        const ws = D.warehouses
          .map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`)
          .join("");
        if ($("#globalWarehouse")) $("#globalWarehouse").innerHTML = all + ws;
        $$(".warehouseSelect").forEach((s) => {
          const old = s.value;
          s.innerHTML = ws;
          if (old && old !== "all") s.value = old;
        });
        if ($("#productOptions"))
          $("#productOptions").innerHTML = D.products
            .map((p) => {
              const text = productSuggestion(p);
              return `<option value="${esc(text)}" label="${esc(text)}"></option>`;
            })
            .join("");
        if ($("#productOrKitOptions"))
          $("#productOrKitOptions").innerHTML =
            D.products
              .map((p) => {
                const text = productSuggestion(p);
                return `<option value="${esc(text)}" label="${esc(text)}"></option>`;
              })
              .join("") +
            D.kits
              .map((k) => {
                const text = kitSuggestion(k);
                return `<option value="${esc(text)}" label="${esc(text)}"></option>`;
              })
              .join("");
        if ($("#categoryOptions"))
          $("#categoryOptions").innerHTML = D.categories
            .filter((x) => !x.parent_id)
            .map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`)
            .join("");
        if ($("#brandOptions"))
          $("#brandOptions").innerHTML = (D.catalogs.brands || [])
            .map((x) => `<option value="${esc(x)}"></option>`)
            .join("");
        if ($("#supplierOptions"))
          $("#supplierOptions").innerHTML = (D.catalogs.suppliers || [])
            .map((x) => `<option value="${esc(x)}"></option>`)
            .join("");
        const ps = D.products
          .map(
            (p) =>
              `<option value="${esc(p.id)}">${esc(p.sku)} — ${esc(p.name)}</option>`,
          )
          .join("");
        $$(".productSelect").forEach((s) => (s.innerHTML = ps));
      }
      function pBy(v) {
        const q = String(v || "")
          .trim()
          .toLowerCase();
        return D.products.find((p) => {
          const values = [p.id, p.sku, p.name, productSuggestion(p)];
          return (
            values.some((x) => String(x || "").toLowerCase() === q) ||
            q.startsWith(String(p.sku || "").toLowerCase() + " —")
          );
        });
      }
      function kBy(v) {
        const q = String(v || "")
          .trim()
          .toLowerCase();
        return D.kits.find((k) => {
          const values = [k.id, k.sku, k.name, kitSuggestion(k)];
          return (
            values.some((x) => String(x || "").toLowerCase() === q) ||
            q.startsWith(String(k.sku || "").toLowerCase() + " —")
          );
        });
      }
      function pName(id) {
        return D.products.find((p) => p.id === id)?.name || id;
      }
      function wName(id) {
        return D.warehouses.find((w) => w.id === id)?.name || id;
      }
      function qty(pid, wid) {
        return D.stock
          .filter(
            (x) =>
              x.product_id === pid &&
              (!wid || wid === "all" || x.warehouse_id === wid),
          )
          .reduce((a, x) => a + Number(x.quantity || 0), 0);
      }
      function state(p) {
        const wid = $("#globalWarehouse")?.value || "all",
          total = qty(p.id, wid),
          s =
            total === 0
              ? "zero"
              : total < p.min
                ? "low"
                : total > p.max
                  ? "high"
                  : "ok";
        return {
          total,
          state: s,
          label: {
            zero: "Sem estoque",
            low: "Abaixo do mínimo",
            high: "Acima do máximo",
            ok: "Estoque normal",
          }[s],
        };
      }

      function outStatus(s) {
        return (
          {
            counted: "Contado",
            sent: "Enviado",
            returned: "Retorno",
            confirmed: "Confirmado",
          }[s] || s
        );
      }
      function outDate(v) {
        return v ? new Date(v).toLocaleString("pt-BR") : "—";
      }
      function elapsed(a, b) {
        if (!a || !b) return "—";
        const min = Math.max(
          0,
          Math.round((new Date(b) - new Date(a)) / 60000),
        );
        return min < 60
          ? `${min} min`
          : `${Math.floor(min / 60)}h ${min % 60}min`;
      }
      function outTimeline(f) {
        return `<div class="out-timeline"><span>Contado<br><b>${outDate(f.counted_at)}</b></span><i>${elapsed(f.counted_at, f.sent_at)}</i><span>Enviado<br><b>${outDate(f.sent_at)}</b></span><i>${elapsed(f.sent_at, f.returned_at)}</i><span>Retorno<br><b>${outDate(f.returned_at)}</b></span><i>${elapsed(f.returned_at, f.confirmed_at)}</i><span>Confirmado<br><b>${outDate(f.confirmed_at)}</b></span></div>`;
      }
      function outItemText(i, ret = false) {
        const q = ret ? i.return_quantity : i.quantity,
          w = ret ? i.return_weight : i.weight;
        return `<div class="out-item"><strong>${esc(i.product_name)}</strong><span>${i.quantity_enabled ? (ret ? `Qtd. ${q ?? 0} / enviado ${i.quantity}` : `Qtd. ${i.quantity}`) : ""}${i.quantity_enabled && i.weight_enabled ? " · " : ""}${i.weight_enabled ? (ret ? `Peso ${w ?? 0} kg / enviado ${i.weight} kg` : `Peso ${i.weight} kg`) : ""}</span>${ret && i.quality_quantity ? `<small>Quantidade com acabamento/qualidade: ${i.quality_quantity}</small>` : ""}${ret && i.return_quality ? `<small>Acabamento: ${esc(i.return_quality)}</small>` : ""}${ret && i.problem_note ? `<small>Problema: ${esc(i.problem_note)}</small>` : ""}</div>`;
      }
      function outFamilyCard(f) {
        const active = f.status !== "confirmed";
        const canEdit = f.status === "counted";
        const previous = {
          sent: "counted",
          returned: "sent",
          confirmed: "returned",
        }[f.status];
        const items = (f.items || [])
          .map((i) =>
            outItemText(i, f.status === "returned" || f.status === "confirmed"),
          )
          .join("");
        const notes = f.notes
          ? '<p class="product-meta"><b>Observação:</b> ' +
            esc(f.notes) +
            "</p>"
          : "";
        const returns = f.return_notes
          ? '<p class="product-meta"><b>Retorno:</b> ' +
            esc(f.return_notes) +
            "</p>"
          : "";
        const send =
          f.status === "counted"
            ? '<button class="primary out-send" data-id="' +
              f.id +
              '">Marcar enviado</button>'
            : "";
        const ret =
          f.status === "sent"
            ? '<button class="primary out-return" data-id="' +
              f.id +
              '">Registrar retorno</button>'
            : "";
        const confirm =
          f.status === "returned"
            ? '<button class="primary out-confirm" data-id="' +
              f.id +
              '">Concluir e lançar no primeiro estoque</button>'
            : "";
        const edit = canEdit
          ? '<button class="secondary out-edit" data-id="' +
            f.id +
            '">Editar contagem</button>'
          : "";
        const undo = previous
          ? '<button class="undo-action out-undo" title="Desfazer ' +
            outStatus(f.status) +
            '" data-id="' +
            f.id +
            '">↶</button>'
          : "";
        const done = active
          ? ""
          : '<span class="confirmed-label">Processo concluído</span>';
        return (
          '<article class="out-family ' +
          f.status +
          '"><div class="out-family-head"><div><span class="out-id">' +
          outStatus(f.status) +
          "</span><h3>Família de " +
          outDate(f.created_at) +
          '</h3></div><span class="family-code">' +
          esc(f.id) +
          '</span></div><div class="out-items">' +
          items +
          "</div>" +
          notes +
          returns +
          outTimeline(f) +
          '<div class="out-actions">' +
          send +
          ret +
          confirm +
          edit +
          undo +
          done +
          "</div></article>"
        );
      }
      function renderOutsourcing() {
        const active = $("#outsourcingActive"),
          done = $("#outsourcingCompleted"),
          warnings = $("#outsourcingWarnings"),
          catalog = $("#outsourcingCatalog");
        if (!active) return;
        const fs = Array.isArray(D.outsourcing) ? D.outsourcing : [];
        const wsAll = fs.flatMap((f) =>
          (f.warnings || []).filter((w) => !w.resolved),
        );
        const summary = $("#outsourcingSummary");
        if (summary) {
          const cards = [
            [
              "counted",
              "Em contagem",
              fs.filter((f) => f.status === "counted").length,
              "Aguardando envio",
            ],
            [
              "sent",
              "Aguardando retorno",
              fs.filter((f) => f.status === "sent").length,
              "Já enviado",
            ],
            [
              "returned",
              "Retorno registrado",
              fs.filter((f) => f.status === "returned").length,
              "Aguardando conferência",
            ],
            ["warning", "Divergências", wsAll.length, "Precisam de atenção"],
            [
              "confirmed",
              "Concluídos",
              fs.filter((f) => f.status === "confirmed").length,
              "Processos finalizados",
            ],
          ];
          summary.innerHTML = cards
            .map(
              (c) =>
                `<div class="outsourcing-kpi ${c[0]}"><span class="outsourcing-kpi-label">${c[1]}</span><strong class="outsourcing-kpi-value">${c[2]}</strong><small class="outsourcing-kpi-caption">${c[3]}</small></div>`,
            )
            .join("");
        }
        const activeCount = $("#outsourcingActiveCount"),
          completedCount = $("#outsourcingCompletedCount");
        if (activeCount)
          activeCount.textContent = fs.filter(
            (f) => f.status !== "confirmed",
          ).length;
        if (completedCount)
          completedCount.textContent = fs.filter(
            (f) => f.status === "confirmed",
          ).length;
        const q = ($("#outsourcingSearch")?.value || "").toLowerCase().trim(),
          filter = $("#outsourcingStatusFilter")?.value || "",
          visible = fs.filter(
            (f) =>
              (!filter || f.status === filter) &&
              (!q ||
                `${f.id} ${(f.items || []).map((i) => i.product_name).join(" ")}`
                  .toLowerCase()
                  .includes(q)),
          );
        active.innerHTML =
          visible
            .filter((f) => f.status !== "confirmed")
            .map(outFamilyCard)
            .join("") ||
          '<div class="empty">Nenhuma família em andamento.</div>';
        done.innerHTML =
          visible
            .filter((f) => f.status === "confirmed")
            .map(outFamilyCard)
            .join("") || '<div class="empty">Nenhum processo concluído.</div>';
        const ws = fs.flatMap((f) =>
          (f.warnings || []).filter((w) => !w.resolved),
        );
        warnings.innerHTML = ws.length
          ? `<div class="warning-panel"><strong>Avisos de conferência</strong>${ws.map((w) => `<div class="warning-row"><span><b>${esc(w.item_product_name)}</b> — ${esc(w.message)}${w.sent != null ? ` (${w.sent} → ${w.returned})` : ""}</span></div>`).join("")}</div>`
          : "";
        const names = [
          ...new Set((D.outsourcingProducts || []).map(String)),
        ].sort((a, b) => a.localeCompare(b, "pt-BR"));
        catalog.innerHTML = `<div class="outsourcing-sidebar-head"><div><strong>Produtos indicados na terceirização</strong><div class="product-meta">Inative um produto para ele não aparecer nas sugestões de nova contagem.</div></div><button type="button" class="outsourcing-sidebar-close" title="Fechar">×</button></div><div class="outsourcing-catalog-list">${
          names
            .map((n) => {
              const on = D.outsourcingProductStatus?.[n] !== false;
              return `<div class="outsourcing-product-row ${on ? "" : "inactive"}"><span>${esc(n)}</span><button class="catalog-toggle ${on ? "" : "off"}" data-name="${esc(n)}" data-active="${on}">${on ? "Ativo" : "Inativo"}</button></div>`;
            })
            .join("") ||
          '<span class="product-meta">Nenhum produto cadastrado ainda.</span>'
        }</div>`;
        $$(".out-send").forEach(
          (b) => (b.onclick = () => outAction(b.dataset.id, "send")),
        );
        $$(".out-confirm").forEach(
          (b) => (b.onclick = () => outAction(b.dataset.id, "confirm")),
        );
        $$(".out-return").forEach(
          (b) =>
            (b.onclick = () =>
              returnOutModal(fs.find((f) => f.id === b.dataset.id))),
        );
        $$(".out-edit").forEach(
          (b) =>
            (b.onclick = () =>
              editOutModal(fs.find((f) => f.id === b.dataset.id))),
        );
        $$(".out-undo").forEach(
          (b) => (b.onclick = () => outAction(b.dataset.id, "undo")),
        );
        $$(".warning-resolve").forEach(
          (b) =>
            (b.onclick = async () => {
              try {
                await post(
                  "/api/outsourcing/warnings/" + b.dataset.id + "/resolve",
                );
                load();
              } catch (e) {
                toast(e.message);
              }
            }),
        );
        $$(".catalog-toggle").forEach(
          (b) =>
            (b.onclick = async () => {
              try {
                const name = b.dataset.name,
                  active = b.dataset.active !== "true";
                await post(
                  "/api/outsourcing-products/" + encodeURIComponent(name),
                  { active },
                  "PUT",
                );
                load();
              } catch (e) {
                toast(e.message);
              }
            }),
        );
        const search = $("#outsourcingSearch"),
          statusFilter = $("#outsourcingStatusFilter");
        if (search && !search.dataset.bound) {
          search.dataset.bound = "1";
          search.oninput = renderOutsourcing;
        }
        if (statusFilter && !statusFilter.dataset.bound) {
          statusFilter.dataset.bound = "1";
          statusFilter.onchange = renderOutsourcing;
        }
        const openCatalog = $("#openOutCatalog");
        if (openCatalog && !openCatalog.dataset.bound) {
          openCatalog.dataset.bound = "1";
          openCatalog.onclick = () => {
            const isOpen = catalog.classList.toggle("open");
            catalog.setAttribute("aria-hidden", String(!isOpen));
          };
        }
        const closeCatalog = $(".outsourcing-sidebar-close");
        if (closeCatalog)
          closeCatalog.onclick = () => {
            catalog.classList.remove("open");
            catalog.setAttribute("aria-hidden", "true");
          };
        if (catalog && !catalog.dataset.bound) {
          catalog.dataset.bound = "1";
          catalog.onclick = (e) => {
            if (e.target === catalog) {
              catalog.classList.remove("open");
              catalog.setAttribute("aria-hidden", "true");
            }
          };
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && catalog.classList.contains("open")) {
              catalog.classList.remove("open");
              catalog.setAttribute("aria-hidden", "true");
            }
          });
        }
      }
      function outProductSuggestions() {
        return (
          Array.isArray(D.outsourcingProducts) ? D.outsourcingProducts : []
        )
          .filter((x) => D.outsourcingProductStatus?.[x] !== false)
          .map((x) => `<option value="${esc(x)}"></option>`)
          .join("");
      }
      function outInputRow() {
        return `<div class="out-input-row"><label class="terc-product-label">Produto / descrição<input class="terc-name" list="outsourcingProductOptions" placeholder="Ex.: Chave de Rosca M" required></label><div class="out-metrics"><label class="metric-toggle"><input type="checkbox" class="terc-q-check"> Habilitar quantidade</label><label class="metric-field terc-q-wrap">Quantidade<input class="terc-q" type="number" min="0" step="0.01" placeholder="Ex.: 100"></label><label class="metric-toggle"><input type="checkbox" class="terc-w-check"> Habilitar peso</label><label class="metric-field terc-w-wrap">Peso (kg)<input class="terc-w" type="number" min="0" step="0.001" placeholder="Ex.: 25,5"></label></div><button type="button" class="remove-out-line">×</button></div>`;
      }
      function newOutModal() {
        openModal(
          `<h2>Nova contagem para terceirização</h2><p class="product-meta">Digite o produto sob medida. Ele ficará no cadastro de terceirização, sem entrar no estoque.</p><form id="outForm" class="modal-form"><datalist id="outsourcingProductOptions">${outProductSuggestions()}</datalist><div id="outInputLines">${outInputRow()}</div><button type="button" class="add-line" id="addOutLine">+ Adicionar produto à família</button><label>Observação da contagem<textarea name="notes" rows="3" placeholder="Ex.: enviado para polimento"></textarea></label><button class="primary">Registrar contagem</button></form>`,
        );
        bindRichProductPickers($("#outInputLines"));
        $("#addOutLine").onclick = () => {
          $("#outInputLines").insertAdjacentHTML("beforeend", outInputRow());
          bindOutRows();
          bindRichProductPickers($("#outInputLines"));
        };
        bindOutRows();
        $("#outForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = $$(".out-input-row").map((r) => {
            const qOn = r.querySelector(".terc-q-check").checked,
              wOn = r.querySelector(".terc-w-check").checked;
            return {
              product_name: r.querySelector(".terc-name").value,
              quantity_enabled: qOn,
              weight_enabled: wOn,
              quantity: r.querySelector(".terc-q").value,
              weight: r.querySelector(".terc-w").value,
            };
          });
          try {
            await post("/api/outsourcing", {
              items,
              notes: new FormData(e.target).get("notes"),
            });
            $("#modal").classList.remove("open");
            toast("Contagem registrada");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function bindOutRows() {
        $$(".remove-out-line").forEach(
          (b) =>
            (b.onclick = () => {
              if ($$(".out-input-row").length > 1)
                b.closest(".out-input-row").remove();
            }),
        );
        $$(".out-input-row").forEach((r) => {
          const q = r.querySelector(".terc-q-check"),
            w = r.querySelector(".terc-w-check"),
            sync = () => {
              r.querySelector(".terc-q-wrap").style.display = q.checked
                ? "grid"
                : "none";
              r.querySelector(".terc-w-wrap").style.display = w.checked
                ? "grid"
                : "none";
            };
          q.onchange = sync;
          w.onchange = sync;
          sync();
        });
      }
      function returnOutModal(f) {
        openModal(
          `<h2>Registrar retorno da família</h2><p class="product-meta">Informe o que voltou. A conferência é registrada agora e só entra no estoque comum quando você confirmar e concluir o processo.</p><form id="returnOutForm" class="modal-form"><label>Estoque de destino<select name="warehouse_id" required><option value="">Selecione o estoque que recebeu o retorno</option>${(D.warehouses || []).map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join("")}</select></label><div class="return-out-lines">${f.items.map((i, n) => `<div class="return-out-row" data-index="${n}"><strong>${esc(i.product_name)}</strong>${i.quantity_enabled ? `<label>Qtd. retornada<input class="ret-q" type="number" min="0" step="0.01" placeholder="Enviado: ${i.quantity}"></label>` : ""}${i.weight_enabled ? `<label>Peso retornado (kg)<input class="ret-w" type="number" min="0" step="0.001" placeholder="Enviado: ${i.weight} kg"></label>` : ""}<label class="return-check"><input type="checkbox" class="ret-problem-check"> Problema com o produto?</label><label class="return-problem-field">Observação do problema<input class="ret-problem-note" placeholder="Descreva o problema"></label><label class="return-check"><input type="checkbox" class="ret-quality-check"> Acabamento e qualidade</label><label class="return-quality-field">Quantidade com acabamento/qualidade ruim<input class="ret-quality-qty" type="number" min="0" step="0.01" value="0"></label><label class="return-quality-field">Observação específica<input class="ret-quality" placeholder="Opcional"></label></div>`).join("")}</div><button class="primary">Registrar retorno</button></form>`,
        );
        $$(".return-out-row").forEach((r) => {
          const pc = r.querySelector(".ret-problem-check"),
            qc = r.querySelector(".ret-quality-check"),
            sync = () => {
              r.querySelector(".return-problem-field").style.display =
                pc.checked ? "grid" : "none";
              r.querySelectorAll(".return-quality-field").forEach(
                (x) => (x.style.display = qc.checked ? "grid" : "none"),
              );
            };
          pc.onchange = sync;
          qc.onchange = sync;
          sync();
        });
        $("#returnOutForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = $$(".return-out-row").map((r, n) => ({
            item_id: String(n),
            return_quantity: r.querySelector(".ret-q")?.value,
            return_weight: r.querySelector(".ret-w")?.value,
            problem_enabled: r.querySelector(".ret-problem-check").checked,
            problem_note: r.querySelector(".ret-problem-note").value,
            quality_enabled: r.querySelector(".ret-quality-check").checked,
            quality_quantity: r.querySelector(".ret-quality-qty").value,
            return_quality: r.querySelector(".ret-quality").value,
            return_note: r.querySelector(".ret-problem-note").value,
          }));
          try {
            await post("/api/outsourcing/" + f.id + "/return", { items, warehouse_id: new FormData(e.target).get("warehouse_id") });
            $("#modal").classList.remove("open");
            toast("Retorno registrado");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function editOutModal(f) {
        if (!f || f.status !== "counted") return;
        openModal(
          `<h2>Editar contagem da família</h2><p class="product-meta">Adicione ou ajuste produtos antes do envio. A data e o horário serão atualizados.</p><form id="editOutForm" class="modal-form"><div id="editOutLines">${(f.items || []).map((i) => outInputRowEdit(i)).join("")}</div><button type="button" class="add-line" id="addEditOutLine">+ Adicionar produto à família</button><label>Observação da contagem<textarea name="notes" rows="3">${esc(f.notes || "")}</textarea></label><button class="primary">Salvar alterações</button></form>`,
        );
        $("#addEditOutLine").onclick = () => {
          $("#editOutLines").insertAdjacentHTML(
            "beforeend",
            outInputRowEdit({}),
          );
          bindOutEditRows();
        };
        bindOutEditRows();
        $("#editOutForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = $$("#editOutLines .out-input-row").map((r) => {
            const qOn = r.querySelector(".terc-q-check").checked,
              wOn = r.querySelector(".terc-w-check").checked;
            return {
              product_name: r.querySelector(".terc-name").value,
              quantity_enabled: qOn,
              weight_enabled: wOn,
              quantity: r.querySelector(".terc-q").value,
              weight: r.querySelector(".terc-w").value,
            };
          });
          try {
            await post(
              "/api/outsourcing/" + f.id + "/edit",
              { items, notes: new FormData(e.target).get("notes") },
              "PUT",
            );
            $("#modal").classList.remove("open");
            toast("Contagem atualizada");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function outInputRowEdit(i = {}) {
        return `<div class="out-input-row"><label class="terc-product-label">Produto / descrição<input class="terc-name" list="outsourcingProductOptions" value="${esc(i.product_name || "")}" required></label><div class="out-metrics"><label class="metric-toggle"><input type="checkbox" class="terc-q-check" ${i.quantity_enabled ? "checked" : ""}> Habilitar quantidade</label><label class="metric-field terc-q-wrap">Quantidade<input class="terc-q" type="number" min="0" step="0.01" value="${i.quantity ?? ""}"></label><label class="metric-toggle"><input type="checkbox" class="terc-w-check" ${i.weight_enabled ? "checked" : ""}> Habilitar peso</label><label class="metric-field terc-w-wrap">Peso (kg)<input class="terc-w" type="number" min="0" step="0.001" value="${i.weight ?? ""}"></label></div><button type="button" class="remove-out-line">×</button></div>`;
      }
      function bindOutEditRows() {
        $$("#editOutLines .remove-out-line").forEach(
          (b) =>
            (b.onclick = () => {
              if ($$("#editOutLines .out-input-row").length > 1)
                b.closest(".out-input-row").remove();
            }),
        );
        $$("#editOutLines .out-input-row").forEach((r) => {
          const q = r.querySelector(".terc-q-check"),
            w = r.querySelector(".terc-w-check"),
            sync = () => {
              r.querySelector(".terc-q-wrap").style.display = q.checked
                ? "grid"
                : "none";
              r.querySelector(".terc-w-wrap").style.display = w.checked
                ? "grid"
                : "none";
            };
          q.onchange = sync;
          w.onchange = sync;
          sync();
        });
      }
      async function outAction(id, action) {
        try {
          await post("/api/outsourcing/" + id + "/" + action);
          toast(
            action === "send"
              ? "Família marcada como enviada"
              : "Processo concluído",
          );
          load();
        } catch (e) {
          toast(e.message);
        }
      }

      // ------------------------------
      // FRONTEND: renderização
      // ------------------------------
      function renderProducts() {
        const q = ($("#search")?.value || "").toLowerCase(),
          f = $("#statusFilter")?.value || "";
        const ps = D.products
          .filter((p) =>
            `${p.name} ${p.sku} ${p.brand || ""} ${p.supplier || ""} ${p.category || ""} ${p.subcategory || ""}`
              .toLowerCase()
              .includes(q),
          )
          .filter((p) => !f || state(p).state === f);
        if (!$("#productGrid")) return;
        $("#productGrid").innerHTML = ps.length
          ? ps
              .map((p) => {
                const x = state(p),
                  initials = esc((p.name || "?").slice(0, 2).toUpperCase());
                return `<article class="product-row"><div class="product-thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span>${initials}</span>`}</div><div class="product-main"><div class="product-title">${esc(p.name)}${p.length || p.width || p.height ? ` — ${p.length || 0} × ${p.width || 0} × ${p.height || 0}` : ""} — ${esc(p.brand || p.supplier || "Sem marca")} ${p.ao ? "— Onda Alta" : ""}${p.bo ? " — Onda Baixa" : ""}</div><div class="product-meta">SKU ${esc(p.sku)} · Unidade ${esc(p.unit)} · ${esc(categoryLabel(p))} · ${esc(p.supplier || "Fornecedor não informado")}</div></div><div class="row-stock"><span class="status ${x.state}">${x.label}</span><strong>${x.total} ${esc(p.unit)}</strong><small>mín. ${p.min} · máx. ${p.max}</small></div><div class="row-actions"><button class="editProduct" data-id="${p.id}">Editar</button><button class="deleteProduct" data-id="${p.id}">Excluir</button></div></article>`;
              })
              .join("")
          : '<div class="empty">Nenhum produto encontrado.</div>';
        $$(".editProduct").forEach(
          (b) => (b.onclick = () => productModal(pBy(b.dataset.id))),
        );
        $$(".deleteProduct").forEach(
          (b) => (b.onclick = () => deleteProduct(b.dataset.id)),
        );
      }
      function renderKits() {
        const el = $("#kitGrid");
        if (!el) return;
        const items = D.kits || [];
        renderIncremental(
          el,
          items,
          (k) =>
            `<article class="kit-card"><div class="product-title">${esc(k.name)}</div><div class="product-meta">${esc(k.sku)}</div><ul>${(k.items || []).map((i) => `<li>${i.quantity} × ${esc(pName(i.product_id))}</li>`).join("")}</ul><div class="card-actions"><button class="editKit" data-id="${k.id}">Editar</button><button class="deleteKit" data-id="${k.id}">Excluir</button></div></article>`,
          `<div class="empty">Nenhum kit cadastrado.</div>`,
          30,
          el,
          () => {
            $$(".editKit").forEach((b) => {
              if (b.dataset.bound) return;
              b.dataset.bound = "1";
              b.onclick = () =>
                kitModal(D.kits.find((k) => k.id === b.dataset.id));
            });
            $$(".deleteKit").forEach((b) => {
              if (b.dataset.bound) return;
              b.dataset.bound = "1";
              b.onclick = () => deleteKit(b.dataset.id);
            });
          },
        );
      }
      function renderWarehouses() {
        const el = $("#warehouseGrid");
        if (!el) return;
        el.innerHTML = D.warehouses
          .map(
            (w) =>
              `<article class="warehouse-card warehouse-open" data-id="${esc(w.id)}" tabindex="0" role="button"><div class="warehouse-card-top"><div><strong>${esc(w.name)}</strong><span class="product-meta">${esc(w.description || "Estoque cadastrado")}</span></div><span class="warehouse-arrow">→</span></div><div class="warehouse-card-actions"><button type="button" class="warehouseEdit" data-id="${esc(w.id)}">Editar nome e descrição</button></div></article>`,
          )
          .join("");
        $$(".warehouse-open").forEach((card) => {
          card.onclick = () => showWarehouseProducts(card.dataset.id);
          card.onkeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              showWarehouseProducts(card.dataset.id);
            }
          };
        });
        $$(".warehouseEdit").forEach(
          (b) =>
            (b.onclick = (e) => {
              e.stopPropagation();
              warehouseModal(D.warehouses.find((w) => w.id === b.dataset.id));
            }),
        );
      }
      function warehouseModal(w = {}) {
        openModal(
          `<h2>${w.id ? "Editar" : "Novo"} estoque</h2><form id="warehouseForm" class="modal-form"><label>Nome<input name="name" value="${esc(w.name || "")}" placeholder="Ex.: Estoque 1" required></label><label>Descrição<input name="description" value="${esc(w.description || "")}" placeholder="Ex.: Principal"></label><button class="primary">${w.id ? "Salvar alterações" : "Cadastrar estoque"}</button></form>`,
        );
        $("#warehouseForm").onsubmit = async (e) => {
          e.preventDefault();
          try {
            await post(
              w.id ? "/api/warehouses/" + w.id : "/api/warehouses",
              Object.fromEntries(new FormData(e.target)),
              w.id ? "PUT" : "POST",
            );
            $("#modal").classList.remove("open");
            toast(w.id ? "Estoque atualizado" : "Estoque cadastrado");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function showWarehouseProducts(wid) {
        $("nav button[data-view=dashboard]")?.click();
        const select = $("#globalWarehouse");
        if (select) {
          select.value = wid;
          renderProducts();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      function outHistoryLabel(action) {
        return (
          {
            counted: "CONTAGEM",
            edit: "EDIÇÃO",
            send: "ENVIO",
            return: "RETORNO",
            confirm: "CONCLUSÃO",
            undo: "DESFAZER",
          }[action] || action
        );
      }
      function renderHistoryFilters() {
        const w = $("#historyWarehouse"),
          p = $("#historyProduct");
        if (!w || !p) return;
        const oldW = w.value,
          oldP = p.value;
        w.innerHTML =
          `<option value="">Todos os estoques</option>` +
          (D.warehouses || [])
            .map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`)
            .join("");
        p.innerHTML =
          `<option value="">Todos os produtos</option>` +
          (D.products || [])
            .map(
              (x) =>
                `<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.sku || "")}</option>`,
            )
            .join("");
        w.value = oldW;
        p.value = oldP;
        const redraw = () => renderHistory();
        ["historySearch", "historyDateFrom", "historyDateTo"].forEach((id) => {
          const x = $("#" + id);
          if (x) x.oninput = redraw;
        });
        ["historyProduct", "historyWarehouse"].forEach((id) => {
          const x = $("#" + id);
          if (x) x.onchange = redraw;
        });
        const clear = $("#historyClear");
        if (clear)
          clear.onclick = () => {
            $("#historySearch").value = "";
            $("#historyDateFrom").value = "";
            $("#historyDateTo").value = "";
            w.value = "";
            p.value = "";
            renderHistory();
          };
      }
      function renderHistory() {
        const el = $("#historyRows");
        if (!el) return;
        const q = ($("#historySearch")?.value || "").trim().toLowerCase(),
          from = $("#historyDateFrom")?.value || "",
          to = $("#historyDateTo")?.value || "",
          product = $("#historyProduct")?.value || "",
          warehouse = $("#historyWarehouse")?.value || "";
        const movements = D.movements.filter((m) => {
          const date = String(m.date || "").slice(0, 10),
            lines = m.lines || [],
            names = lines
              .map(
                (x) =>
                  `${x.product_name || ""} ${x.kit_name || ""} ${pName(x.product_id)}`,
              )
              .join(" ")
              .toLowerCase(),
            haystack =
              `${m.invoice || ""} ${m.family_id || ""} ${m.note || ""} ${names}`.toLowerCase(),
            warehouseOk =
              !warehouse ||
              m.warehouse_id === warehouse ||
              m.to_warehouse_id === warehouse,
            productOk =
              !product ||
              lines.some(
                (x) => x.product_id === product || x.kit_id === product,
              ),
            dateOk = (!from || date >= from) && (!to || date <= to);
          return (
            (!q || haystack.includes(q)) && warehouseOk && productOk && dateOk
          );
        });
        const row = (m) => {
          const terc = m.type === "OUTSOURCING",
            type = terc
              ? `TERCEIRIZAÇÃO · ${esc(outHistoryLabel(m.action))}`
              : {
                  IN: "ENTRADA",
                  OUT: "SAÍDA",
                  TRANSFER: "TRANSFERÊNCIA",
                  KIT_OUT: "KIT",
                  DYNAMIC_IN: "ENTRADA DINÂMICA",
                  DYNAMIC_OUT: "SAÍDA DINÂMICA",
                }[m.type] || m.type,
            products = terc
              ? (m.lines || [])
                  .map(
                    (x) =>
                      `<div class="history-product"><span class="history-product-name">${esc(x.product_name || "—")}</span></div>`,
                  )
                  .join("")
              : (m.lines || [])
                  .map(
                    (x) =>
                      `<div class="history-product"><span class="history-qty">${esc(String(x.quantity ?? ""))} ×</span><span class="history-product-name">${esc(x.kit_name || x.product_name || pName(x.product_id))}</span>${x.expiry_date ? `<small>Validade: ${new Date(`${x.expiry_date}T00:00:00`).toLocaleDateString("pt-BR")}</small>` : ""}</div>`,
                  )
                  .join("");
          return `<tr><td class="history-date">${new Date(m.date).toLocaleString("pt-BR")}</td><td><span class="history-type type-${m.type}">${type}</span></td><td>${esc(m.purchase_label || m.invoice || m.family_id || "—")}</td><td class="history-location">${terc ? "Terceirizando" : `${esc(wName(m.warehouse_id))}${m.to_warehouse_id ? " → " + esc(wName(m.to_warehouse_id)) : ""}`}</td><td><div class="history-products">${products || `<span class="product-meta">Nenhum produto informado.</span>`}</div></td><td class="history-note">${esc(m.note || (m.shortages?.length ? "Entrada com falta de componentes." : "—"))}</td></tr>`;
        };
        renderIncremental(
          el,
          movements,
          row,
          `<tr><td colspan="6" class="history-no-results">Nenhuma movimentação encontrada com esses filtros.</td></tr>`,
          40,
          el.closest(".table-wrap"),
        );
      }
      function renderRecent() {
        const groups = {
          recentEntry: ["IN", "Últimas entradas"],
          recentExit: ["OUT", "Últimas saídas"],
          recentTransfer: ["TRANSFER", "Últimas transferências"],
        };
        Object.entries(groups).forEach(([panel, [type, title]]) => {
          const el = $("#" + panel);
          if (!el) return;
          el.innerHTML = `<div class="recent-title">${title}</div><div class="recent-scroll"></div>`;
          const list = el.querySelector(".recent-scroll"),
            items = D.movements.filter((m) => m.type === type),
            label =
              type === "IN"
                ? "ENTRADA"
                : type === "OUT"
                  ? "SAÍDA"
                  : "TRANSFERÊNCIA";
          renderIncremental(
            list,
            items,
            (m) =>
              `<div class="recent-item"><span class="type-${m.type}">${label}</span><strong>${(m.lines || []).map((x) => `${x.quantity} × ${esc(x.kit_name || pName(x.product_id))}`).join(", ")}</strong><small>${new Date(m.date).toLocaleString("pt-BR")} · ${esc(wName(m.warehouse_id))}</small></div>`,
            `<span class="product-meta">Nenhuma movimentação ainda.</span>`,
            20,
            list,
          );
        });
      }
      function renderCategories() {
        const el = $("#categoryList");
        if (!el) return;
        const roots = D.categories.filter((c) => !c.parent_id);
        el.innerHTML = roots.length
          ? roots
              .map((c) => {
                const children = catChildren(c.id);
                return `<article class="category-tree"><div class="category-tree-head"><div class="category-heading"><span class="category-mark">#</span><div><strong>${esc(c.name)}</strong><small>${children.length} ${children.length === 1 ? "subcategoria" : "subcategorias"}</small></div></div><div class="category-actions category-root-actions"><button class="category-root-action category-root-edit categoryEdit" data-id="${c.id}">Editar principal</button><button class="category-root-action category-root-delete categoryDelete" data-id="${c.id}">Excluir principal</button></div></div><div class="subcategory-list">${children.map((sub) => `<div class="subcategory-item"><span class="subcategory-name"><span class="subcategory-dot">↳</span>${esc(sub.name)}</span><span class="category-actions"><button class="categoryEdit" data-id="${sub.id}">Editar</button><button class="categoryDelete" data-id="${sub.id}">Excluir</button></span></div>`).join("") || `<small class="product-meta category-empty">Sem subcategorias cadastradas</small>`}</div></article>`;
              })
              .join("")
          : `<div class="empty">Nenhuma categoria cadastrada.</div>`;
        $("#categoryList").classList.add("category-layout");
        $$(".categoryEdit").forEach(
          (b) => (b.onclick = () => editCategory(b.dataset.id)),
        );
        $$(".categoryDelete").forEach(
          (b) => (b.onclick = () => deleteCategory(b.dataset.id)),
        );
      }
      function renderCatalogs() {
        const c = D.catalogs || { brands: [], suppliers: [] },
          block = (kind, title, subtitle) => {
            const items = c[kind] || [];
            return `<section class="catalog-card"><div class="catalog-card-head"><div><strong>${title}</strong><small>${subtitle}</small></div><span class="catalog-count">${items.length}</span></div><div class="catalog-list">${items.length ? items.map((x) => `<div class="catalog-row"><span class="catalog-name" title="${esc(x)}">${esc(x)}</span><span class="catalog-actions"><button class="catalogEdit" data-kind="${kind}" data-name="${esc(x)}">Editar</button><button class="catalogDelete" data-kind="${kind}" data-name="${esc(x)}">Excluir</button></span></div>`).join("") : `<div class="catalog-empty">Nenhum cadastro ainda.</div>`}</div></section>`;
          };
        const el = $("#catalogLists");
        if (el) {
          el.innerHTML =
            block("brands", "Marcas cadastradas", "Nomes usados nos produtos") +
            block(
              "suppliers",
              "Fornecedores cadastrados",
              "Parceiros e origens de compra",
            );
          el.classList.add("catalog-layout");
        }
        $("#catalogLists")
          .querySelectorAll(".catalogEdit")
          .forEach(
            (b) =>
              (b.onclick = () => editCatalog(b.dataset.kind, b.dataset.name)),
          );
        $("#catalogLists")
          .querySelectorAll(".catalogDelete")
          .forEach(
            (b) =>
              (b.onclick = () => deleteCatalog(b.dataset.kind, b.dataset.name)),
          );
      }

      const MARKETPLACE_LABELS = { mercadolivre: "Mercado Livre", shopee: "Shopee" };
      const marketplaceName = (provider) => MARKETPLACE_LABELS[provider] || provider;
      const marketplaceDestinations = () => [
        ...D.products.map(p => ({ id:p.id, type:"product", label:`Produto · ${p.sku} — ${p.name}` })),
        ...D.kits.map(k => ({ id:k.id, type:"kit", label:`Kit · ${k.sku || "—"} — ${k.name}` })),
        ...(D.outsourcingProducts || []).map(name => ({ id:name, type:"outsourcing", label:`Terceirização · ${name}` })),
        ...(D.dynamicProducts || []).map(p => ({ id:p.id, type:"dynamic_product", label:`Dinâmico · ${p.name}` })),
        ...(D.dynamicProducts || []).flatMap(p => (p.nodes || []).map(n => ({ id:`${p.id}::${n.id}`, type:"dynamic_component", label:`Componente · ${p.name} / ${n.name}` }))),
      ];
      function marketplaceDestinationLabel(m) { return marketplaceDestinations().find(x => x.id === m.destination_id && x.type === m.destination_type)?.label || `${m.destination_type} · ${m.destination_id}`; }
      // ------------------------------
      // FRONTEND: integração de marketplaces
      // ------------------------------
      function marketplaceIcon(provider) {
        const asset = provider === "mercadolivre" ? "/static/assets/mercado-livre.png" : "/static/assets/shopee.png";
        const label = provider === "mercadolivre" ? "Mercado Livre" : "Shopee";
        return `<span class="marketplace-brand-icon ${provider === "mercadolivre" ? "mercado-livre-icon" : "shopee-icon"}" aria-label="${label}"><img src="${asset}" alt="${label}" /></span>`;
      }
      function marketplaceItemKey(provider, eventId, item) {
        return `${provider}:${eventId}:${item.external_item_id}:${item.external_variation_id || "0"}`;
      }
      function marketplaceMappedItem(provider, item) {
        return (D.marketplaceMappings || []).find(m => m.provider === provider && String(m.external_item_id || m.external_id) === String(item.external_item_id) && String(m.external_variation_id || "0") === String(item.external_variation_id || "0"));
      }
      function marketplaceEventIsMapped(e) {
        const items = Array.isArray(e.items) && e.items.length ? e.items : [{ external_item_id:e.external_id, external_variation_id:"0" }];
        return items.every(item => marketplaceMappedItem(e.provider, item));
      }
      function marketplaceDestinationForMapping(m) {
        return marketplaceDestinations().find(x => x.id === m.destination_id && x.type === m.destination_type) || { id:m.destination_id, type:m.destination_type, label:`${m.destination_type} · ${m.destination_id}` };
      }
      function marketplaceCanvasLine(canvas, x1, y1, x2, y2, label) {
        const line = document.createElement("div");
        line.className = "marketplace-canvas-edge";
        line.style.width = Math.hypot(x2-x1, y2-y1) + "px";
        line.style.transform = `translate(${x1}px,${y1}px) rotate(${Math.atan2(y2-y1,x2-x1)}rad)`;
        canvas.append(line);
        if (label) { const badge=document.createElement("span"); badge.className="marketplace-canvas-edge-label"; badge.textContent=label; badge.style.left=(x1+x2)/2+"px"; badge.style.top=(y1+y2)/2+"px"; canvas.append(badge); }
        return line;
      }
      function marketplaceConfirmCanvasMapping(provider, event, item, destination) {
        openModal(`<h2>Confirmar mapeamento</h2><p class="product-meta">Você está conectando este anúncio externo ao destino do estoque. Essa regra será reutilizada nas próximas vendas do mesmo anúncio/variação.</p><div class="marketplace-confirm-flow"><strong>${esc(item.title || item.external_item_id)}</strong><span>→</span><strong>${esc(destination.label)}</strong></div><p class="product-meta">${marketplaceName(provider)} · pedido ${esc(event.external_id)} · ID externo ${esc(item.external_item_id)} · variação ${esc(item.external_variation_id || "0")}</p><form id="marketplaceCanvasMapForm" class="modal-form"><label>Quantidade consumida por unidade vendida<input name="quantity" type="number" min="0.01" step="0.01" value="1" required></label><div class="marketplace-modal-actions"><button type="button" class="secondary" id="marketplaceCanvasCancel">Cancelar</button><button class="primary">Salvar conexão</button></div></form>`);
        $("#marketplaceCanvasCancel").onclick=()=>$("#modal").classList.remove("open");
        $("#marketplaceCanvasMapForm").onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);await post("/api/marketplace/mappings",{provider,external_id:event.external_id,external_item_id:item.external_item_id,external_variation_id:item.external_variation_id||"0",external_sku:item.external_sku||"",external_title:item.title||event.title||"",destination_type:destination.type,destination_id:destination.id,quantity:Number(f.get("quantity"))});$("#modal").classList.remove("open");toast("Conexão salva no mapeamento ativo.");load();};
      }
      function marketplaceRenderCanvas() {
        const canvas=$("#marketplaceMappingCanvas"); if(!canvas) return; canvas.innerHTML="";
        const sourceItems=[], seen=new Set();
        for(const e of (D.marketplaceEvents||[])) for(const item of (Array.isArray(e.items)&&e.items.length?e.items:[{external_item_id:e.external_id,external_variation_id:"0",title:e.title,quantity:e.quantity}])) { const key=`${e.provider}:${item.external_item_id}:${item.external_variation_id||"0"}`; if(!seen.has(key)){seen.add(key);sourceItems.push({event:e,item});} }
        const sourceSearch = ($("#marketplaceCanvasSourceSearch")?.value || "").trim().toLowerCase();
        const targetSearch = ($("#marketplaceCanvasTargetSearch")?.value || "").trim().toLowerCase();
        const visibleSourceItems = sourceItems.filter(x => !sourceSearch || `${x.event.provider} ${x.event.external_id} ${x.event.title || ""} ${x.item.title || ""} ${x.item.external_sku || ""}`.toLowerCase().includes(sourceSearch));
        sourceItems.splice(0, sourceItems.length, ...visibleSourceItems);
        const destinations=marketplaceDestinations().filter(d => !targetSearch || `${d.label} ${d.type} ${d.id}`.toLowerCase().includes(targetSearch)).slice(0, targetSearch ? 100 : 40);
        // Depois de conectar, reserva a mesma linha para os dois lados.
        // Assim as regras ficam organizadas e as linhas não se cruzam.
        const rowBySource=new Map(), rowByTarget=new Map();
        let nextRow=0;
        const sourceKeyFor=(m)=>{const item=sourceItems.find(x=>x.event.provider===m.provider && String(x.item.external_item_id)===String(m.external_item_id) && String(x.item.external_variation_id||"0")===String(m.external_variation_id||"0"));return item?marketplaceItemKey(item.event.provider,item.event.external_id,item.item):null;};
        for(const m of (D.marketplaceMappings||[])){
          const sourceKey=sourceKeyFor(m), targetKey=`${m.destination_type}:${m.destination_id}`;
          if(sourceKey && !rowBySource.has(sourceKey) && !rowByTarget.has(targetKey)){rowBySource.set(sourceKey,nextRow);rowByTarget.set(targetKey,nextRow);nextRow++;}
        }
        sourceItems.forEach(entry=>{const key=marketplaceItemKey(entry.event.provider,entry.event.external_id,entry.item);if(!rowBySource.has(key))rowBySource.set(key,nextRow++);});
        destinations.forEach(destination=>{const key=`${destination.type}:${destination.id}`;if(!rowByTarget.has(key))rowByTarget.set(key,nextRow++);});
        const height=Math.max(520, nextRow*88+40); canvas.style.height=height+"px";
        const sourceByKey=new Map(), targetByKey=new Map();
        sourceItems.forEach((entry)=>{const node=document.createElement("div");node.className="marketplace-canvas-node marketplace-canvas-source";node.style.left="18px";node.style.top=(20+rowBySource.get(marketplaceItemKey(entry.event.provider,entry.event.external_id,entry.item))*88)+"px";node.dataset.key=marketplaceItemKey(entry.event.provider,entry.event.external_id,entry.item);const mapped=marketplaceMappedItem(entry.event.provider,entry.item);node.innerHTML=`<span class="marketplace-canvas-node-kicker">${esc(marketplaceName(entry.event.provider))} · ${esc(entry.event.external_id)}</span><strong>${esc(entry.item.title||entry.item.external_item_id)}</strong><small>${Number(entry.item.quantity||1)} un. · ${mapped?"Já conectado":"Pendente"}</small><button class="marketplace-canvas-handle source" type="button" title="Arraste para conectar">●</button>`;canvas.append(node);sourceByKey.set(node.dataset.key,node);});
        destinations.forEach((destination)=>{const node=document.createElement("div");node.className="marketplace-canvas-node marketplace-canvas-target";node.style.right="18px";node.style.top=(20+rowByTarget.get(`${destination.type}:${destination.id}`)*88)+"px";node.dataset.destinationId=destination.id;node.dataset.destinationType=destination.type;node.innerHTML=`<span class="marketplace-canvas-node-kicker">${esc(destination.type === "product" ? "PRODUTO" : destination.type === "kit" ? "KIT" : "DESTINO")}</span><strong>${esc(destination.label.replace(/^(Produto|Kit|Terceirização|Dinâmico|Componente) · /,""))}</strong><small>${destination.type === "product" ? "SKU interno" : "Destino de estoque"}</small><span class="marketplace-canvas-handle target">●</span>`;canvas.append(node);targetByKey.set(`${destination.type}:${destination.id}`,node);});
        for(const m of (D.marketplaceMappings||[])){const src=[...sourceByKey.values()].find(n=>{const e=sourceItems.find(x=>marketplaceItemKey(x.event.provider,x.event.external_id,x.item)===n.dataset.key);return e&&e.event.provider===m.provider&&String(e.item.external_item_id)===String(m.external_item_id)&&String(e.item.external_variation_id||"0")===String(m.external_variation_id||"0")});const dst=targetByKey.get(`${m.destination_type}:${m.destination_id}`);if(src&&dst){const sr=src.getBoundingClientRect(),dr=dst.getBoundingClientRect(),cr=canvas.getBoundingClientRect();marketplaceCanvasLine(canvas,sr.right-cr.left,sr.top-cr.top+sr.height/2,dr.left-cr.left,dr.top-cr.top+dr.height/2,String(m.quantity||1));}}
        let connect=null;
        const point=(event)=>{const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};};
        canvas.querySelectorAll(".marketplace-canvas-handle.source").forEach(button=>button.onpointerdown=event=>{event.preventDefault();event.stopPropagation();const node=button.closest(".marketplace-canvas-node"),entry=sourceItems.find(x=>marketplaceItemKey(x.event.provider,x.event.external_id,x.item)===node.dataset.key),p=point(event);connect={entry,x:p.x,y:p.y,line:marketplaceCanvasLine(canvas,p.x,p.y,p.x,p.y)};});
        canvas.onpointermove=event=>{if(!connect)return;const p=point(event),line=connect.line;line.style.width=Math.hypot(p.x-connect.x,p.y-connect.y)+"px";line.style.transform=`translate(${connect.x}px,${connect.y}px) rotate(${Math.atan2(p.y-connect.y,p.x-connect.x)}rad)`;};
        canvas.onpointerup=event=>{if(!connect)return;const target=event.target.closest(".marketplace-canvas-target"),current=connect;connect=null;current.line.remove();if(target){const destination=destinations.find(d=>d.id===target.dataset.destinationId&&d.type===target.dataset.destinationType);if(destination)marketplaceConfirmCanvasMapping(current.entry.event.provider,current.entry.event,current.entry.item,destination);}};
      }
      let marketplaceMappingPage = 1;
      let marketplaceUndoMapping = null;
      function marketplaceMappingLabel(m) { return marketplaceDestinationForMapping(m).label.replace(/^(Produto|Kit|Terceirização|Dinâmico|Componente) · /, ""); }
      function marketplaceMappingMatches(m) {
        const q = ($("#marketplaceRuleSearch")?.value || "").trim().toLowerCase(), provider = $("#marketplaceMappingProviderFilter")?.value || "", type = $("#marketplaceRuleTypeFilter")?.value || "";
        const hay = [m.provider,m.external_id,m.external_title,m.external_sku,marketplaceMappingLabel(m),marketplaceName(m.provider)].join(" ").toLowerCase();
        return (!q || hay.includes(q)) && (!provider || m.provider === provider) && (!type || m.destination_type === type);
      }
      async function marketplaceDeleteMapping(id) {
        const mapping=(D.marketplaceMappings||[]).find(x=>x.id===id);
        if (!mapping || !(await internalConfirm("Desativar este vínculo? Ele deixará de ser usado nas próximas vendas.", { title: "Desativar vínculo", confirmLabel: "Desativar" }))) return;
        try { await post(`/api/marketplace/mappings/${id}`,{},"DELETE"); marketplaceUndoMapping=mapping; toast("Vínculo desativado. Use Desfazer se precisar restaurá-lo."); load(); } catch(e) { toast(e.message); }
      }
      function renderMarketplaces() {
        const cards=$("#marketplaceCards"), listings=$("#marketplaceListings"), mappings=$("#marketplaceMappings"); if(!cards) return; const selectedConnection=(D.apiConnections||[]).find(c=>c.id===activeApiConnection); if($("#marketplaceViewTitle")) $("#marketplaceViewTitle").textContent=selectedConnection?.name || (activeApiConnection === "mercadolivre" ? "Mercado Livre" : activeApiConnection === "shopee" ? "Shopee" : "Conectar APIs"); if($("#marketplaceViewDescription")) $("#marketplaceViewDescription").textContent=selectedConnection ? "Conexão personalizada · configure, sincronize e mapeie os itens recebidos." : activeApiConnection === "overview" ? "Mercado Livre, Shopee e qualquer sistema externo com API ou webhook." : "Integração oficial · configure, sincronize e mapeie os pedidos.";
        const visibleProviders = activeApiConnection === "overview" || String(activeApiConnection).startsWith("API-") ? ["mercadolivre", "shopee"] : [activeApiConnection]; cards.innerHTML=visibleProviders.filter(provider=>provider === "mercadolivre" || provider === "shopee").map(provider=>{const c=(D.marketplaceConnections||[]).find(x=>x.provider===provider)||{},ev=(D.marketplaceEvents||[]).filter(x=>x.provider===provider),status=c.status==="connected"?"connected":c.status==="configured"?"pending":"";return `<article class="marketplace-card"><div class="marketplace-card-head"><div class="marketplace-brand"><div class="marketplace-brand-mark">${marketplaceIcon(provider)}</div><div><h3>${marketplaceName(provider)}</h3><small>${c.shop_name||"Nenhuma conta autorizada"}</small></div></div><span class="marketplace-badge ${status}">${c.status==="connected"?"Conectada":c.status==="configured"?"Configuração salva":"Não conectada"}</span></div><small>Última sincronização: ${c.last_sync_at?new Date(c.last_sync_at).toLocaleString("pt-BR"):"Nunca"} · ${ev.length} evento(s)</small><div class="marketplace-actions"><button type="button" class="secondary marketplace-config" data-provider="${provider}">${c.status?"Editar configuração":"Configurar API"}</button>${c.status?`<button type="button" class="secondary marketplace-sync-one" data-provider="${provider}">Sincronizar</button>`:""}</div></article>`;}).join("");
        if ((D.apiConnections || []).length) cards.innerHTML += `<div class="marketplace-custom-divider"><p class="eyebrow">CONEXÕES PERSONALIZADAS</p><h2>Outros sistemas</h2></div>` + (activeApiConnection === "overview" ? D.apiConnections : D.apiConnections.filter(c => c.id === activeApiConnection)).map(customConnectionCard).join("");
        const search=( $("#marketplaceExternalSearch")?.value||"" ).trim().toLowerCase(), providerFilter=$("#marketplaceMappingProviderFilter")?.value||"", statusFilter=$("#marketplaceMappingStatusFilter")?.value||"";
        const selectedProvider = activeApiConnection !== "overview" ? activeApiConnection : "";
        const events=(D.marketplaceEvents||[]).filter(e=>{const mapped=marketplaceEventIsMapped(e);return(!search||JSON.stringify(e).toLowerCase().includes(search))&&(!selectedProvider||e.provider===selectedProvider)&&(!providerFilter||e.provider===providerFilter)&&(!statusFilter||(statusFilter==="mapped"?mapped:!mapped));});
        if($("#marketplaceExternalCount")) $("#marketplaceExternalCount").textContent=`${events.length} pedido(s)`;
        const mappedCount=(D.marketplaceMappings||[]).length,pendingCount=(D.marketplaceEvents||[]).filter(e=>!marketplaceEventIsMapped(e)).length;
        if($("#marketplaceKpis")) $("#marketplaceKpis").innerHTML=`<div class="marketplace-kpi"><small>Pedidos recebidos</small><strong>${(D.marketplaceEvents||[]).length}</strong></div><div class="marketplace-kpi success"><small>Mapeamentos ativos</small><strong>${mappedCount}</strong></div><div class="marketplace-kpi warning"><small>Aguardando vínculo</small><strong>${pendingCount}</strong></div>`;
        listings.innerHTML=events.slice(0,100).map(e=>{const mapped=marketplaceEventIsMapped(e);return `<article class="marketplace-listing"><div class="marketplace-listing-main"><strong>${esc(e.title||e.external_id)}</strong><small>${marketplaceName(e.provider)} · ID ${esc(e.external_id)} · ${Number(e.quantity||1)} unidade(s) · ${e.status==="posted"?"Baixado no estoque":mapped?"Pronto para lançar":"Aguardando mapeamento"}</small></div><span class="marketplace-badge ${mapped?"connected":"pending"}">${mapped?"Mapeado":"Sem vínculo"}</span><button class="secondary marketplace-map" data-provider="${esc(e.provider)}" data-external-id="${esc(e.external_id)}">${mapped?"Editar vínculo":"Mapear item"}</button></article>`;}).join("")||`<div class="empty">Nenhuma venda encontrada.</div>`;
        const all=(D.marketplaceMappings||[]).filter(marketplaceMappingMatches), size=10, pages=Math.max(1,Math.ceil(all.length/size)); marketplaceMappingPage=Math.min(marketplaceMappingPage,pages); const page=all.slice((marketplaceMappingPage-1)*size,marketplaceMappingPage*size);
        if($("#marketplaceMappingCount")) $("#marketplaceMappingCount").textContent=`${all.length} regra(s)`;
        mappings.innerHTML=page.length?`<div class="marketplace-rule-head"><span>Canal / anúncio</span><span>Destino do estoque</span><span>Consumo</span><span>Ação</span></div>`+page.map(m=>{const d=marketplaceDestinationForMapping(m);return `<article class="marketplace-rule-row"><div><strong>${marketplaceName(m.provider)} · ${esc(m.external_id)}</strong><small>${esc(m.external_title||"Anúncio externo")} · variação ${esc(m.external_variation_id||"0")}</small></div><div><strong>${esc(marketplaceMappingLabel(m))}</strong><small>${esc(d.type==="product"?"Produto comum":d.type==="kit"?"Kit":"Destino de estoque")}${m.external_sku?` · SKU ${esc(m.external_sku)}`:""}</small></div><span class="marketplace-rule-qty">${Number(m.quantity||1)} / venda</span><button class="danger marketplace-delete-map" data-id="${esc(m.id)}">Desativar vínculo</button></article>`;}).join(""):`<div class="empty">Nenhum mapeamento corresponde aos filtros.</div>`;
        $("#marketplaceMappingPagination").innerHTML=pages>1?`<button class="secondary" data-map-page="prev" ${marketplaceMappingPage===1?"disabled":""}>Anterior</button><span>Página ${marketplaceMappingPage} de ${pages}</span><button class="secondary" data-map-page="next" ${marketplaceMappingPage===pages?"disabled":""}>Próxima</button>`:"";
        const undo=$("#marketplaceUndoMapping"); if(undo){undo.hidden=!marketplaceUndoMapping;undo.onclick=async()=>{if(!marketplaceUndoMapping)return;const m=marketplaceUndoMapping;await post("/api/marketplace/mappings",{provider:m.provider,external_id:m.external_id,external_item_id:m.external_item_id,external_variation_id:m.external_variation_id||"0",external_sku:m.external_sku||"",external_title:m.external_title||"",destination_type:m.destination_type,destination_id:m.destination_id,quantity:Number(m.quantity||1)});marketplaceUndoMapping=null;toast("Vínculo restaurado");load();};}
        $(".marketplace-custom-divider")?.classList.toggle("hidden", activeApiConnection !== "overview" && !String(activeApiConnection).startsWith("API-")); $$(".custom-edit").forEach(b=>b.onclick=()=>customConnectionModalFromId(b.dataset.id)); $$(".custom-sync").forEach(b=>b.onclick=async()=>{try{const r=await post(`/api/connections/${b.dataset.id}/sync`,{});toast(`${r.imported||0} pedido(s) recebido(s)`);load();}catch(e){toast(e.message);}}); $$(".custom-delete").forEach(b=>b.onclick=async()=>{if(await internalConfirm("Excluir esta conexão e os mapeamentos dela?", { title: "Excluir conexão", confirmLabel: "Excluir" })){await post(`/api/connections/${b.dataset.id}`,{},"DELETE");load();}}); $$(".custom-webhook").forEach(b=>b.onclick=async()=>{try{const r=await apiFetch(`/api/connections/${b.dataset.id}/webhook-token`); const x=await r.json(); if(!r.ok) throw Error(x.error||"Não foi possível consultar o webhook"); const value=`/api/webhooks/${x.webhook_token}`; try{await navigator.clipboard.writeText(value); toast("URL do webhook copiada");}catch(_){internalText("Use esta URL para receber pedidos automaticamente.", value, { title: "URL do webhook", label: "URL do webhook" });}}catch(e){toast(e.message);}}); $$(".marketplace-config").forEach(b=>b.onclick=()=>marketplaceConnectionModal(b.dataset.provider));$$('.marketplace-sync-one').forEach(b=>b.onclick=()=>marketplaceSync(b.dataset.provider));$$('.marketplace-map').forEach(b=>b.onclick=()=>marketplaceMappingModal(b.dataset.provider,b.dataset.externalId));$$('.marketplace-delete-map').forEach(b=>b.onclick=()=>marketplaceDeleteMapping(b.dataset.id));$$('[data-map-page]').forEach(b=>b.onclick=()=>{marketplaceMappingPage+=b.dataset.mapPage==="next"?1:-1;renderMarketplaces();});
        if ($("#marketplaceExternalSearch")) $("#marketplaceExternalSearch").oninput=renderMarketplaces;
        if ($("#marketplaceMappingProviderFilter")) $("#marketplaceMappingProviderFilter").onchange=renderMarketplaces;
        if ($("#marketplaceMappingStatusFilter")) $("#marketplaceMappingStatusFilter").onchange=renderMarketplaces;
        if ($("#marketplaceRuleSearch")) $("#marketplaceRuleSearch").oninput=()=>{marketplaceMappingPage=1;renderMarketplaces();};
        if ($("#marketplaceRuleTypeFilter")) $("#marketplaceRuleTypeFilter").onchange=()=>{marketplaceMappingPage=1;renderMarketplaces();};
      }
      function marketplaceOpenVisualMap() {
        openModal(`<div class="marketplace-fullscreen-head"><div><p class="eyebrow">EDIÇÃO VISUAL</p><h2>Mapa de conexões</h2><p class="product-meta">Arraste o ponto vermelho de um anúncio até o destino verde. Pesquise antes para reduzir a lista.</p></div><button type="button" class="secondary" id="closeMarketplaceMap">Voltar para mapeamentos</button></div><div class="marketplace-canvas-toolbar"><input id="marketplaceCanvasSourceSearch" placeholder="Pesquisar anúncio ou pedido" /><input id="marketplaceCanvasTargetSearch" placeholder="Pesquisar produto, kit ou destino" /></div><div class="marketplace-canvas-help"><span class="marketplace-help-dot external"></span> Anúncio externo <span class="marketplace-help-arrow">→</span> <span class="marketplace-help-dot internal"></span> Destino do estoque</div><div id="marketplaceMappingCanvas" class="marketplace-mapping-canvas marketplace-fullscreen-canvas" aria-label="Canvas de mapeamentos"></div>`); $("#modal").classList.add("marketplace-fullscreen"); $("#closeMarketplaceMap").onclick=()=>$("#modal").classList.remove("open","marketplace-fullscreen"); [$("#marketplaceCanvasSourceSearch"),$("#marketplaceCanvasTargetSearch")].forEach(i=>i?.addEventListener("input",marketplaceRenderCanvas)); marketplaceRenderCanvas();
      }
      function customConnectionModal(connection = {}) {
        const isEditing = Boolean(connection.id);
        const tokenPlaceholder = connection.token === "configured" ? "já configurado; deixe vazio para manter" : "Opcional — somente se a API exigir";
        openModal(`<h2>${isEditing ? "Editar conexão" : "Criar nova conexão"}</h2><p class="product-meta">Informe somente o acesso. Depois de salvar, o sistema consulta um exemplo da resposta JSON, identifica os caminhos comuns e deixa tudo pronto para revisar no Canvas.</p><form id="customConnectionForm" class="modal-form"><label>Nome da conexão<input name="name" value="${esc(connection.name || "")}" placeholder="Ex.: ERP, e-commerce ou PTR" required></label><label>URL dos pedidos ou ordens<input name="base_url" type="url" value="${esc(connection.base_url || "")}" placeholder="https://sistema.com/api/orders" required></label><div class="action-grid"><label>Método<select name="method"><option value="GET" ${connection.method === "POST" ? "" : "selected"}>GET</option><option value="POST" ${connection.method === "POST" ? "selected" : ""}>POST</option></select></label><label>Prefixo do token<input name="auth_prefix" value="${esc(connection.auth_prefix || "Bearer")}" placeholder="Bearer, Token ou none"></label></div><label>Token <span class="product-meta">(opcional)</span><input name="token" type="password" placeholder="${tokenPlaceholder}"></label><button class="primary">${isEditing ? "Salvar e redescobrir campos" : "Criar e descobrir campos"}</button></form>`);
        $("#customConnectionForm").onsubmit = async (event) => { event.preventDefault(); const f = new FormData(event.target); const body = Object.fromEntries(f.entries()); if (!body.token && isEditing) delete body.token; try { const saved = await post(isEditing ? `/api/connections/${connection.id}` : "/api/connections", body, isEditing ? "PUT" : "POST"); let discovery = null; try { discovery = await post(`/api/connections/${saved.id}/discover`, {}); } catch (error) { toast(`Conexão salva, mas não foi possível descobrir o JSON: ${error.message}`); } if (discovery) toast(discovery.message || "Campos identificados. Agora mapeie no Canvas."); $("#modal").classList.remove("open"); activeApiConnection = saved.id; load(); } catch (e) { toast(e.message); } };
      }
      function customConnectionCard(c) { const events=(D.marketplaceEvents||[]).filter(x=>x.provider===c.id), maps=(D.marketplaceMappings||[]).filter(x=>x.provider===c.id); return `<article class="marketplace-card custom-api-card"><div class="marketplace-card-head"><div class="marketplace-brand"><div class="marketplace-brand-mark custom-api-mark">●</div><div><h3>${esc(c.name)}</h3><small>${esc(c.base_url)}</small></div></div><span class="marketplace-badge ${c.status === "connected" ? "connected" : "pending"}">${c.status === "connected" ? "Conectada" : "Configurada"}</span></div><small>${events.length} pedido(s) · ${maps.length} mapeamento(s) · ${c.last_sync_at ? `Sincronizada ${new Date(c.last_sync_at).toLocaleString("pt-BR")}` : "Ainda não sincronizada"}</small><p class="product-meta custom-webhook-url">Webhook: token protegido — gere/consulte pela configuração administrativa.</p><div class="marketplace-actions"><button type="button" class="secondary custom-edit" data-id="${esc(c.id)}">Configurar</button><button type="button" class="secondary custom-sync" data-id="${esc(c.id)}">Sincronizar</button><button type="button" class="secondary custom-webhook" data-id="${esc(c.id)}">Mostrar webhook</button><button type="button" class="danger custom-delete" data-id="${esc(c.id)}">Excluir</button></div></article>`; }
      function renderApiNavigation() { const box=$("#apiCustomNav"); if (!box) return; box.innerHTML=(D.apiConnections||[]).map(c=>`<button type="button" data-view="marketplaces" data-connection="${esc(c.id)}">${esc(c.name)}</button>`).join(""); if (typeof add11IsEnabled === "function" && !add11IsEnabled("marketplaces")) { $("#apiSubnav").hidden=true; return; } $("#apiSubnav").hidden=false; box.querySelectorAll("button").forEach(b=>b.onclick=()=>{ activeApiConnection=b.dataset.connection; renderApiNavigation(); renderMarketplaces(); $$('[data-view="marketplaces"]').forEach(x=>x.classList.toggle("active",x.dataset.connection===activeApiConnection)); }); }
      function customConnectionModalFromId(id) { customConnectionModal((D.apiConnections||[]).find(x=>x.id===id)||{}); }
      window.openCustomConnectionModal = () => customConnectionModal();
      function marketplaceConnectionModal(provider) {
        const c = (D.marketplaceConnections || []).find(x => x.provider === provider) || {};
        const isShopee = provider === "shopee";
        const tokenPlaceholder = c.access_token === "configured" ? "já configurado; deixe vazio para manter" : "Cole o token aqui";
        openModal(`<h2>Conectar ${marketplaceName(provider)}</h2><p class="product-meta">Preencha somente os dados necessários para conectar esta loja.</p><form id="marketplaceConnectionForm" class="modal-form">${isShopee ? `<label>Partner ID<input name="partner_id" value="${esc(c.partner_id || "")}" inputmode="numeric" required></label><label>Partner Key<input name="partner_key" type="password" value="" placeholder="${c.partner_key === "configured" ? "já configurado; deixe vazio para manter" : "Cole a chave da aplicação"}"></label><label>Shop ID<input name="shop_id" value="${esc(c.shop_id || "")}" inputmode="numeric" required></label>` : ""}<label>Access Token<input name="access_token" type="password" value="" placeholder="${tokenPlaceholder}"></label><label class="check-line"><input name="push_stock" type="checkbox" ${c.push_stock !== false ? "checked" : ""}> Atualizar estoque no marketplace</label><button type="submit" class="primary marketplace-submit">Salvar conexão</button></form>`);
        $("#marketplaceConnectionForm").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const body = Object.fromEntries(f.entries()); body.push_stock = f.get("push_stock") === "on"; await post(`/api/marketplace/connections/${provider}`, body); $("#modal").classList.remove("open"); toast("Conexão salva. Clique em Sincronizar agora."); load(); };
      }
      function marketplaceMappingModal(provider, externalId) {
        const e = (D.marketplaceEvents || []).find(x => x.provider === provider && x.external_id === externalId) || {};
        const eventItems = Array.isArray(e.items) && e.items.length ? e.items : [{ external_item_id: externalId, external_variation_id: "0", external_sku: "", title: e.title || externalId, quantity: e.quantity || 1 }];
        const destinationOptions = marketplaceDestinations();
        openModal(`<h2>Mapear itens do pedido</h2><p class="product-meta">${marketplaceName(provider)} · pedido ${esc(externalId)}. Escolha uma linha por vez; o pedido só baixa quando todas estiverem mapeadas.</p><form id="marketplaceMappingForm" class="modal-form"><label>Item do pedido<select name="item_index">${eventItems.map((item, i) => `<option value="${i}">${esc(item.title || item.external_item_id)} · ${Number(item.quantity || 0)} un.</option>`).join("")}</select></label><div id="marketplaceItemMeta" class="product-meta"></div><label>Tipo de destino<select name="destination_type"><option value="product">Produto comum</option><option value="kit">Kit</option><option value="outsourcing">Produto de terceirização</option><option value="dynamic_product">Produto dinâmico</option><option value="dynamic_component">Componente de produto dinâmico</option></select></label><label>Destino<select name="destination_id">${destinationOptions.map(x => `<option value="${esc(x.id)}" data-type="${x.type}">${esc(x.label)}</option>`).join("")}</select></label><label>Quantidade consumida por unidade vendida<input name="quantity" type="number" min="0.01" step="0.01" value="1" required></label><button class="primary">Salvar vínculo deste item</button></form>`);
        const form = $("#marketplaceMappingForm"), type = form.querySelector('[name="destination_type"]'), dest = form.querySelector('[name="destination_id"]'), index = form.querySelector('[name="item_index"]'), meta = $("#marketplaceItemMeta");
        function selectedItem() { return eventItems[Number(index.value)] || eventItems[0]; }
        function filterDest() { [...dest.options].forEach(o => o.hidden = o.dataset.type !== type.value); const visible = [...dest.options].find(o => !o.hidden); if (visible) dest.value = visible.value; }
        function refreshItem() { const item = selectedItem(); const current = (D.marketplaceMappings || []).find(m => m.provider === provider && String(m.external_item_id || m.external_id) === String(item.external_item_id) && String(m.external_variation_id || "0") === String(item.external_variation_id || "0")); meta.textContent = `ID externo: ${item.external_item_id} · variação: ${item.external_variation_id || "0"} · SKU: ${item.external_sku || "(sem SKU)"}`; type.value = current?.destination_type || "product"; form.querySelector('[name="quantity"]').value = current?.quantity || 1; filterDest(); }
        type.onchange = filterDest; index.onchange = refreshItem; refreshItem();
        form.onsubmit = async ev => { ev.preventDefault(); const item = selectedItem(); const f = new FormData(form); await post("/api/marketplace/mappings", { provider, external_id: item.external_item_id, external_item_id: item.external_item_id, external_variation_id: item.external_variation_id || "0", external_sku: item.external_sku || "", external_title: item.title || e.title || "", destination_type: f.get("destination_type"), destination_id: f.get("destination_id"), quantity: Number(f.get("quantity")) }); toast("Vínculo salvo para este item."); if (eventItems.length > 1 && Number(index.value) < eventItems.length - 1) { index.value = String(Number(index.value) + 1); refreshItem(); } else { $("#modal").classList.remove("open"); load(); } };
      }
      function dynamicEditingActive() {
        return Boolean(document.querySelector(".dynamic-modal-backdrop") || (dynamicDraft && $("#dynamicEditor") && !$("#dynamicEditor").hidden));
      }
      async function marketplaceSync(provider = "all") { try { const r = await post("/api/marketplace/sync", { provider }); toast(r.message || "Sincronização concluída"); if (!dynamicEditingActive()) await load(); } catch(e) { toast(e.message); } }
      function marketplaceListingModal() { openModal(`<h2>Adicionar anúncio de teste</h2><p class="product-meta">Use isto para validar o mapeamento e a baixa antes de conectar as credenciais reais.</p><form id="marketplaceListingForm" class="modal-form"><label>Canal<select name="provider"><option value="mercadolivre">Mercado Livre</option><option value="shopee">Shopee</option></select></label><label>ID do anúncio/pedido<input name="external_id" placeholder="MLB-123 ou pedido Shopee" required></label><label>Produto anunciado<input name="title" required></label><label>Quantidade vendida<input name="quantity" type="number" min="1" value="1" required></label><button class="primary">Adicionar venda pendente</button></form>`); $("#marketplaceListingForm").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); await post("/api/marketplace/events", { provider:f.get("provider"), external_id:f.get("external_id"), title:f.get("title"), quantity:Number(f.get("quantity")), status:"pending" }); $("#modal").classList.remove("open"); toast("Venda adicionada para mapeamento"); load(); }; }
      function richPickerItems(input) {
        const list = input.dataset.richList || input.getAttribute("list");
        if (list === "outsourcingProductOptions") return [...new Set([...(D.outsourcingProducts || []).map(String), ...(D.outsourcing || []).flatMap((family) => (family.items || []).map((item) => item.product_name).filter(Boolean))])].map((name) => ({ value: name, title: name, meta: "Produto de terceirização" }));
        const products = (D.products || []).map((product) => ({ value: productSuggestion(product), title: product.name, meta: `SKU ${product.sku || "—"} · ${product.brand || "Sem marca"} · Produto comum` }));
        if (list === "productOrKitOptions") return products.concat((D.kits || []).map((kit) => ({ value: kitSuggestion(kit), title: kit.name, meta: `SKU ${kit.sku || "—"} · Kit` })));
        if (list === "productOptions") return products;
        return [];
      }
      function bindRichProductPickers(root = document) {
        root.querySelectorAll?.('input[list="productOptions"], input[list="productOrKitOptions"], input[list="outsourcingProductOptions"]').forEach((input) => {
          if (input.dataset.richPicker === "1") return;
          input.dataset.richPicker = "1";
          input.dataset.richList = input.getAttribute("list") || "";
          input.removeAttribute("list");
          const host = input.parentElement;
          if (!host) return;
          host.classList.add("rich-picker-field");
          const menu = document.createElement("div");
          menu.className = "rich-picker-menu";
          menu.hidden = true;
          host.append(menu);
          const render = () => {
            const query = String(input.value || "").trim().toLowerCase();
            const items = richPickerItems(input).filter((item) => !query || `${item.title} ${item.meta} ${item.value}`.toLowerCase().includes(query)).slice(0, 80);
            menu.innerHTML = items.length ? items.map((item) => `<button type="button" class="rich-picker-option" data-value="${esc(item.value)}"><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></button>`).join("") : `<div class="rich-picker-empty">Nenhum item encontrado.</div>`;
            menu.hidden = false;
          };
          input.addEventListener("focus", render);
          input.addEventListener("input", render);
          menu.addEventListener("mousedown", (event) => {
            const option = event.target.closest(".rich-picker-option");
            if (!option) return;
            event.preventDefault();
            input.value = option.dataset.value || "";
            menu.hidden = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        });
        if (document.body.dataset.richPickerOutside !== "1") {
          document.body.dataset.richPickerOutside = "1";
          document.addEventListener("mousedown", (event) => {
            document.querySelectorAll(".rich-picker-menu:not([hidden])").forEach((menu) => {
              if (!menu.parentElement?.contains(event.target)) menu.hidden = true;
            });
          });
        }
      }
      function bindExpandablePickerSelects(root = document) {
        root.querySelectorAll?.("select.picker-select").forEach((select) => {
          if (select.dataset.expandablePicker === "1") return;
          select.dataset.expandablePicker = "1";
          const collapse = () => { select.size = 1; select.classList.remove("is-expanded"); };
          const expand = () => { if (select.options.length > 7) { select.size = Math.min(8, select.options.length); select.classList.add("is-expanded"); } };
          select.addEventListener("focus", expand);
          select.addEventListener("click", expand);
          select.addEventListener("change", collapse);
          select.addEventListener("blur", () => setTimeout(collapse, 120));
        });
      }
      function supplierTypeLabel(type) {
        return { product: "Produto comum", dynamic: "Produto dinâmico", outsourcing: "Terceirização" }[type] || type;
      }
      function supplierNames() {
        return [...new Set([
          ...(D.catalogs?.suppliers || []).map(String),
          ...(D.outsourcing || []).flatMap((family) => (family.items || []).map((item) => item.supplier).filter(Boolean)),
        ])].sort((a, b) => a.localeCompare(b, "pt-BR"));
      }
      function fillSupplierOrderSupplierSelect(selected = "") {
        const select = $("#supplierOrderSupplier");
        if (!select) return;
        select.innerHTML = `<option value="">Selecione o fornecedor</option>${supplierNames().map((name) => `<option value="${esc(name)}" ${name === selected ? "selected" : ""}>${esc(name)}</option>`).join("")}`;
      }
      function supplierProductItems(type) {
        const outsourcingNames = [...new Set([
          ...(D.outsourcingProducts || []).map(String),
          ...(D.outsourcing || []).flatMap((family) => (family.items || []).map((item) => item.product_name).filter(Boolean)),
          ...Object.keys(D.outsourcingMeta || {}),
          ...(D.outsourcingStock || []).map((item) => item.product_name).filter(Boolean),
        ])].sort((a, b) => a.localeCompare(b, "pt-BR"));
        if (type === "dynamic") return (D.dynamicProducts || []).map((p) => ({ id: p.id, title: p.name, meta: `SKU ${p.sku || "—"} · Produto dinâmico` }));
        if (type === "outsourcing") return outsourcingNames.map((name) => ({ id: name, title: name, meta: "Produto de terceirização" }));
        const products = Array.isArray(D.products) && D.products.length
          ? D.products
          : [...document.querySelectorAll("#productOptions option")].map((option) => ({ id: option.value, name: option.value, sku: "", brand: "" }));
        return products.map((p) => ({ id: p.id, title: p.name, meta: `SKU ${p.sku || "—"} · ${p.brand || "Sem marca"} · Produto comum` }));
      }
      function fillSupplierOrderProductSelect() {
        const type = $("#supplierOrderType")?.value || "product";
        const search = $("#supplierOrderProductSearch"), hidden = $("#supplierOrderProduct"), menu = $("#supplierOrderProductMenu");
        if (!search || !hidden || !menu) return;
        const items = supplierProductItems(type);
        if (!items.some((item) => String(item.id) === String(hidden.value))) {
          hidden.value = "";
          search.value = "";
        } else {
          const selected = items.find((item) => String(item.id) === String(hidden.value));
          search.value = selected ? `${selected.title} · ${selected.meta}` : "";
        }
        const render = () => {
          const query = String(search.value || "").trim().toLowerCase();
          const filtered = items.filter((item) => !query || `${item.title} ${item.meta}`.toLowerCase().includes(query)).slice(0, 100);
          menu.innerHTML = filtered.length ? filtered.map((item) => `<button type="button" class="rich-picker-option" data-value="${esc(item.id)}" data-label="${esc(`${item.title} · ${item.meta}`)}"><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></button>`).join("") : `<div class="rich-picker-empty">Nenhum produto encontrado.</div>`;
          menu.hidden = false;
        };
        if (search.dataset.boundSupplierPicker !== "1") {
          search.dataset.boundSupplierPicker = "1";
          search.addEventListener("focus", () => search._supplierPickerRender?.());
          search.addEventListener("input", () => { hidden.value = ""; search._supplierPickerRender?.(); });
          menu.addEventListener("mousedown", (event) => {
            const option = event.target.closest(".rich-picker-option");
            if (!option) return;
            event.preventDefault();
            hidden.value = option.dataset.value || "";
            search.value = option.dataset.label || "";
            menu.hidden = true;
            search.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }
        // O tipo do item pode mudar sem recriar o input. Atualize a função
        // usada pelos listeners para que o menu nunca reutilize a lista do
        // tipo anterior (produto comum x dinâmico x terceirização).
        search._supplierPickerRender = render;
        if (document.activeElement === search) render();
        bindExpandablePickerSelects();
      }
      function dynamicPlanRowsForOrder(order) {
        return Array.isArray(order?.dynamic_plan) ? order.dynamic_plan : [];
      }
      function supplierQuantityState(received, planned) {
        const difference = Number(received || 0) - Number(planned || 0);
        if (Math.abs(difference) < 0.000001) return "match";
        return difference > 0 ? "above" : "below";
      }
      function supplierNodeForItem(product, item) {
        const nodes = product?.nodes || [];
        return nodes.find((node) => node.id === item?.node_id || (item?.node_ids || []).includes(node.id) || node.name === item?.node_name) || {};
      }
      function supplierNodeDepth(product, node) {
        const nodes = product?.nodes || [];
        const byId = new Map(nodes.map((item) => [item.id, item]));
        let depth = 0, current = node;
        while (current?.parent_id && byId.has(current.parent_id) && depth < nodes.length) {
          depth += 1;
          current = byId.get(current.parent_id);
        }
        return depth;
      }
      function supplierLevelLabel(depth) {
        if (depth === 0) return "Produto inicial";
        if (depth === 1) return "Produto principal";
        return `${depth + 1}º nível · componentes`;
      }
      function supplierPlanMarkup(items, product, renderItem) {
        const rows = [];
        (items || []).forEach((item, index) => {
          const node = supplierNodeForItem(product, item);
          const depth = supplierNodeDepth(product, node);
          rows.push({ item, node, depth, index });
        });
        return rows.sort((a, b) => a.depth - b.depth || a.index - b.index).map(({ item, node, depth }) => renderItem(item, node, depth)).join("");
      }
      function supplierPlanRowForNode(plan, node) {
        return (plan || []).find((item) => item.group_id === String(node?.stock_group_id || node?.id || "")) || (plan || []).find((item) => item.node_id === node?.id || (item.node_ids || []).includes(node?.id) || item.node_name === node?.name);
      }
      function supplierExcessNote(item) {
        const excess = Number(item?.received || 0) - Number(item?.planned || 0);
        return excess > 0.000001 ? `<small class="supplier-excess-note">${excess} a mais</small>` : "";
      }
      function supplierCompositionNote(item, node, product, plan) {
        const children = (product?.nodes || []).filter((candidate) => candidate.parent_id === node?.id);
        if (!children.length) return "";
        const capacities = children.map((child) => {
          const childRow = supplierPlanRowForNode(plan, child);
          const perParent = Number(child.quantity_per_parent || 0);
          return perParent > 0 ? Number(childRow?.received || 0) / perParent : Infinity;
        });
        const possible = Math.floor(Math.min(...capacities));
        if (!Number.isFinite(possible)) return "";
        const received = Number(item?.received || 0);
        if (possible === received) return "";
        if (possible > received) return `<small class="supplier-composition-note">Componentes para ${possible} ${esc(node.unit || "UN")}; faltam ${possible - received} ${esc(node.name || "unidade(s)")} principal(is)</small>`;
        return `<small class="supplier-composition-note">Componentes para ${possible} ${esc(node.unit || "UN")}; faltam ${received - possible} conjunto(s) de componentes</small>`;
      }
      function renderSupplierDynamicPlanPreview() {
        const host = $("#supplierDynamicPlanPreview");
        if (!host) return;
        const type = $("#supplierOrderType")?.value || "product";
        const product = (D.dynamicProducts || []).find((item) => item.id === $("#supplierOrderProduct")?.value);
        const quantity = Number($("#supplierOrderQuantity")?.value || 0);
        if (type !== "dynamic" || !product || !(quantity > 0)) { host.hidden = true; host.innerHTML = ""; return; }
        const root = (product.nodes || []).find((node) => !node.parent_id) || (product.nodes || []).find((node) => node.id === product.stock_base_node_id) || (product.nodes || [])[0];
        if (!root) { host.hidden = true; return; }
        const expanded = new Map();
        const visit = (nodeId, amount) => {
          const node = (product.nodes || []).find((item) => item.id === nodeId);
          if (!node) return;
          const group = String(node.stock_group_id || node.id);
          expanded.set(group, (expanded.get(group) || 0) + amount);
          (product.nodes || []).filter((child) => child.parent_id === node.id).forEach((child) => visit(child.id, amount * Number(child.quantity_per_parent || 0)));
        };
        visit(root.id, quantity);
        const previewItems = [...expanded].map(([group, amount]) => { const node = (product.nodes || []).find((item) => String(item.stock_group_id || item.id) === group) || {}; return { node_id: node.id, node_name: node.name || group, amount, unit: node.unit || "UN" }; });
        const rows = supplierPlanMarkup(previewItems, product, (item, node, depth) => `<div class="supplier-plan-row supplier-plan-depth-${Math.min(depth + 1, 6)}"><strong>${esc(node.name || item.node_name)}</strong><span>${item.amount} ${esc(node.unit || item.unit || "UN")}</span><small>${node.id === root.id ? "Produto inicial" : "Calculado pela composição"}</small></div>`);
        host.hidden = false;
        host.innerHTML = `<div class="supplier-plan-head"><strong>Composição calculada</strong><span>${quantity} ${esc(product.unit || "UN")} comprado(s)</span></div><p class="product-meta">A quantidade do produto principal gera automaticamente os componentes abaixo. Cada componente pode ser recebido separadamente.</p><div class="supplier-plan-grid">${rows}</div>`;
      }
      function supplierOrderReceiveModal(order) {
        const dynamic = order.product_type === "dynamic";
        const product = dynamic ? (D.dynamicProducts || []).find((p) => p.id === order.product_id) : null;
        const plan = dynamicPlanRowsForOrder(order);
        const remainingForNode = (node) => {
          const group = String(node?.stock_group_id || node?.id || "");
          const row = plan.find((item) => item.group_id === group) || plan.find((item) => item.node_id === node?.id || (item.node_ids || []).includes(node?.id) || item.node_name === node?.name);
          return Math.max(0, Number(row?.planned || 0) - Number(row?.received || 0));
        };
        const rootRemaining = Number(order.quantity_ordered || 0) - Number(order.quantity_received || 0);
        const nodes = product?.nodes || [];
        const nodeField = dynamic ? `<label class="wide">Componente que chegou<select name="node_id" id="supplierReceiptNode">${nodes.map((node) => { const left = remainingForNode(node); const isBase = node.id === product?.stock_base_node_id; return `<option value="${esc(node.id)}" data-max="${left}" ${node.id === order.node_id ? "selected" : ""}>${esc(node.name)}${isBase ? " · base de estoque" : ""} — faltam ${left} ${esc(node.unit || "UN")}</option>`; }).join("")}</select><small class="dynamic-muted">Ao receber a base ou um subproduto, o sistema inclui os componentes da própria árvore; quando todos os subprodutos necessários chegam, monta automaticamente a base de estoque e converte para a unidade principal.</small></label>` : "";
        const planMarkup = dynamic ? `<div class="supplier-receipt-plan wide"><strong>Saldo da composição</strong>${supplierPlanMarkup(plan, product, (item, node) => `<span>${esc(item.node_name)}: <b class="supplier-quantity supplier-quantity-${supplierQuantityState(item.received, item.planned)}">${Number(item.received || 0)}</b> / ${Number(item.planned || 0)} ${esc(item.unit || "UN")}${supplierExcessNote(item)}${supplierCompositionNote(item, node, product, plan)}</span>`)}</div>` : "";
        const shortageOptions = dynamic ? nodes.map((node) => `<option value="${esc(node.id)}">${esc(node.name)}</option>`).join("") : "";
        const shortageMarkup = dynamic ? `<div class="supplier-shortage-fields wide"><label class="check-line"><input type="checkbox" id="supplierHasShortages"> Entrada com falta de componente</label><div id="supplierShortages" hidden><div class="supplier-shortage-rows"><div class="supplier-shortage-row"><select name="shortage_node_id">${shortageOptions}</select><input name="shortage_quantity" type="number" min="0.01" step="0.01" placeholder="Quantidade faltante"><input name="shortage_note" placeholder="Observação"><button type="button" class="secondary supplier-remove-shortage">×</button></div></div><button type="button" class="secondary" id="supplierAddShortage">+ Adicionar outro componente faltante</button><small class="dynamic-muted">A quantidade faltante não entra no estoque e vira uma task pendente.</small></div></div>` : "";
        const defaultMax = dynamic ? (plan.length ? remainingForNode(nodes.find((node) => node.id === order.node_id)) : rootRemaining) : rootRemaining;
        openModal(`<h2>Registrar recebimento</h2><p class="product-meta"><strong>${esc(order.product_name)}</strong><br>${esc(order.supplier)} · Pedido de ${order.quantity_ordered} ${esc(order.unit || "UN")} · ${dynamic ? "recebimento por componente" : `Recebido ${order.quantity_received || 0} · Pendente ${rootRemaining}`}</p><form id="supplierReceiptForm" class="modal-form"><div class="form-grid"><label>Data da entrega<input name="date" type="date" value="${todayInputValue()}" required></label><label>Estoque de destino<select name="warehouse_id" required>${(D.warehouses || []).map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join("")}</select></label>${nodeField}<label>Quantidade recebida<input name="quantity" id="supplierReceiptQuantity" type="number" min="0.01" step="0.01" required></label>${planMarkup}${shortageMarkup}</div><label>Observação<input name="note" placeholder="Ex.: Chegaram as bases da entrega 1 de 2"></label><button class="primary">Registrar recebimento</button></form>`);
        const nodeSelect = $("#supplierReceiptNode"), qtyInput = $("#supplierReceiptQuantity"), shortageToggle = $("#supplierHasShortages"), shortageBox = $("#supplierShortages");
        if (shortageToggle && shortageBox) shortageToggle.onchange = () => { shortageBox.hidden = !shortageToggle.checked; };
        $("#supplierAddShortage")?.addEventListener("click", () => { const rows = $(".supplier-shortage-rows"), template = rows?.querySelector(".supplier-shortage-row"); if (!rows || !template) return; const clone = template.cloneNode(true); clone.querySelectorAll("input").forEach((input) => { input.value = ""; }); rows.append(clone); bindSupplierShortageRemoveButtons(); });
        function bindSupplierShortageRemoveButtons() { $("#supplierShortages")?.querySelectorAll(".supplier-remove-shortage").forEach((button) => button.onclick = () => { const rows = $("#supplierShortages").querySelectorAll(".supplier-shortage-row"); if (rows.length > 1) button.closest(".supplier-shortage-row")?.remove(); }); }
        bindSupplierShortageRemoveButtons();
        nodeSelect?.addEventListener("change", () => { qtyInput.removeAttribute("max"); });
        $("#supplierReceiptForm").onsubmit = async (event) => {
          event.preventDefault();
          const f = new FormData(event.target), quantity = Number(f.get("quantity"));
          if (!(quantity > 0)) return toast("Informe uma quantidade maior que zero.");
          const shortages = shortageToggle?.checked ? [...document.querySelectorAll("#supplierShortages .supplier-shortage-row")].map((row) => ({ node_id: row.querySelector("[name=shortage_node_id]")?.value, quantity: Number(row.querySelector("[name=shortage_quantity]")?.value || 0), note: row.querySelector("[name=shortage_note]")?.value || "" })).filter((item) => item.node_id && item.quantity > 0) : [];
          try { await post(`/api/supplier-orders/${encodeURIComponent(order.id)}/receipts`, { date: f.get("date"), warehouse_id: f.get("warehouse_id"), quantity, node_id: f.get("node_id") || order.node_id || "", shortages, note: f.get("note") || "" }); $("#modal").classList.remove("open"); toast(shortages.length ? "Entrega conferida com falta de componente" : "Entrega conferida; aguarde 100% para incluir no estoque"); await load(); } catch (error) { toast(error.message); }
        };
      }
      function renderSupplierOrders() {
        const list = $("#supplierOrdersList");
        if (!list) return;
        const allOrders = D.supplierOrders || [];
        fillSupplierOrderSupplierSelect($("#supplierOrderSupplier")?.value || "");
        fillSupplierOrderProductSelect();
        const query = ($( "#supplierOrdersSearch")?.value || "").trim().toLowerCase();
        const statusFilter = $("#supplierOrdersStatus")?.value || "";
        const typeFilter = $("#supplierOrdersType")?.value || "";
        const details = (order) => {
          const ordered = Number(order.quantity_ordered || 0), received = Number(order.quantity_received || 0);
          const plan = dynamicPlanRowsForOrder(order);
          const planOrdered = plan.reduce((sum, item) => sum + Number(item.planned || 0), 0);
          const planReceived = plan.reduce((sum, item) => sum + Number(item.received || 0), 0);
          const isDynamicPlan = order.product_type === "dynamic" && plan.length > 0;
          const rootPlan = isDynamicPlan ? (plan.find((item) => item.node_id === order.node_id || (item.node_ids || []).includes(order.node_id)) || plan[0]) : null;
          const rootReceived = isDynamicPlan ? Number(rootPlan?.received || received) : received;
          const rootPlanned = isDynamicPlan ? Number(rootPlan?.planned || ordered) : ordered;
          const progress = isDynamicPlan && planOrdered > 0 ? Math.min(100, Math.round((planReceived / planOrdered) * 100)) : ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
          const remaining = isDynamicPlan ? Math.max(0, planOrdered - planReceived) : Math.max(0, ordered - received);
          return { ordered: isDynamicPlan ? planOrdered : ordered, received: isDynamicPlan ? planReceived : received, remaining, progress, status: order.status === "complete" || progress >= 100 ? "complete" : progress > 0 ? "partial" : "open", isDynamicPlan, mainPlanned: isDynamicPlan ? rootPlanned : ordered };
        };
        const filtered = allOrders.filter((order) => {
          const d = details(order), haystack = [order.id, order.external_id, order.supplier, order.product_name].join(" ").toLowerCase();
          return (!query || haystack.includes(query)) && (!statusFilter || d.status === statusFilter) && (!typeFilter || order.product_type === typeFilter);
        });
        list.innerHTML = filtered.length ? filtered.map((order) => {
          const d = details(order), receipts = (order.receipts || []).map((receipt) => `<div class="supplier-receipt"><strong>${receipt.quantity} ${esc(order.unit || "UN")}</strong><span>${esc(String(receipt.date || "").slice(0, 10))} · ${esc(wName(receipt.warehouse_id) || "Estoque")}${receipt.node_id && order.product_type === "dynamic" ? ` · ${esc((D.dynamicProducts.find((p) => p.id === order.product_id)?.nodes || []).find((n) => n.id === receipt.node_id)?.name || "Componente")}` : ""}</span>${receipt.shortages?.length ? `<small>Faltas: ${receipt.shortages.map((item) => `${item.quantity} ${esc((D.dynamicProducts.find((p) => p.id === order.product_id)?.nodes || []).find((n) => n.id === item.node_id)?.name || "componente")}`).join(", ")}</small>` : ""}${receipt.note ? `<small>${esc(receipt.note)}</small>` : ""}</div>`).join("");
          const dynamicProduct = order.product_type === "dynamic" ? (D.dynamicProducts || []).find((product) => product.id === order.product_id) : null;
          const dynamicPlan = dynamicPlanRowsForOrder(order);
          const dynamic = dynamicProduct ? supplierPlanMarkup(dynamicPlan, dynamicProduct, (item, node, depth) => `<div class="supplier-plan-row supplier-plan-depth-${Math.min(depth + 1, 6)}"><strong>${esc(item.node_name)}</strong><span><b class="supplier-quantity supplier-quantity-${supplierQuantityState(item.received, item.planned)}">${Number(item.received || 0)}</b> / ${Number(item.planned || 0)} ${esc(item.unit || "UN")}</span><small>${Math.max(0, Number(item.planned || 0) - Number(item.received || 0))} pendente(s)</small>${supplierExcessNote(item)}${supplierCompositionNote(item, node, dynamicProduct, dynamicPlan)}</div>`) : "";
          const actionButton = order.stock_included_at
            ? `<button type="button" class="secondary supplier-complete-button" disabled>Concluído · incluído no estoque</button>`
            : d.status === "complete"
              ? `<button type="button" class="primary supplier-include-button" data-id="${esc(order.id)}">Incluir no estoque</button>`
              : `<button type="button" class="primary supplier-receive-button" data-id="${esc(order.id)}">+ Registrar entrega${d.remaining > 0 ? ` · faltam ${d.remaining}` : ""}</button>`;
          return `<article class="panel supplier-order-card"><div class="supplier-order-head"><div><p class="eyebrow">${esc(order.id)}${order.external_id ? ` · Ref. ${esc(order.external_id)}` : ""} · ${esc(supplierTypeLabel(order.product_type))}</p><h3>${esc(order.product_name)}</h3><p class="product-meta">${esc(order.supplier)} · Compra em ${esc(order.order_date || "—")}</p></div><span class="supplier-order-status ${d.status}">${order.stock_included_at ? "Concluído" : d.status === "complete" ? "100% conferido" : d.status === "partial" ? "Recebimento parcial" : "Aguardando entrega"}</span></div><div class="supplier-progress-summary"><div class="supplier-progress-label"><strong>${d.progress}% conferido</strong><span>${d.remaining > 0 ? `faltam ${d.remaining} ${esc(order.unit || "UN")}` : order.stock_included_at ? "Incluído no estoque" : "Pronto para incluir no estoque"}</span></div><div class="supplier-progress-track"><i style="width:${d.progress}%"></i></div></div><div class="supplier-order-kpis"><div><small>${d.isDynamicPlan ? "Total planejado" : "Quantidade comprada"}</small><strong>${d.mainPlanned} ${esc(order.unit || "UN")}</strong></div><div><small>Total conferido</small><strong>${d.received} ${esc(order.unit || "UN")}</strong></div><div><small>Saldo pendente</small><strong>${d.remaining} ${esc(order.unit || "UN")}</strong></div></div>${dynamic ? `<div class="supplier-components"><small>Composição calculada · recebido / planejado</small><div class="supplier-plan-grid">${dynamic}</div></div>` : ""}${order.note ? `<p class="supplier-order-note"><b>Observação:</b> ${esc(order.note)}</p>` : ""}<details class="supplier-receipts-details"><summary>Entregas vinculadas <span>${(order.receipts || []).length}</span></summary><div class="supplier-receipts">${receipts || `<span class="product-meta">Nenhuma entrega registrada.</span>`}</div></details><div class="supplier-order-actions">${actionButton}<button type="button" class="danger supplier-delete-button" data-id="${esc(order.id)}">Excluir</button></div></article>`;
        }).join("") : `<div class="panel empty">${allOrders.length ? "Nenhum pedido corresponde aos filtros." : "Nenhuma compra cadastrada. Cadastre o primeiro pedido acima."}</div>`;
        list.querySelectorAll(".supplier-receive-button").forEach((button) => button.onclick = () => supplierOrderReceiveModal(allOrders.find((order) => order.id === button.dataset.id)));
        list.querySelectorAll(".supplier-include-button").forEach((button) => button.onclick = async () => {
          try { await post(`/api/supplier-orders/${encodeURIComponent(button.dataset.id)}/include-stock`, {}); toast("Pedido incluído no estoque"); await load(); }
          catch (error) { toast(error.message); }
        });
        list.querySelectorAll(".supplier-delete-button").forEach((button) => button.onclick = async () => {
          const order = allOrders.find((item) => item.id === button.dataset.id);
          if (!order || !(await internalConfirm(`Excluir o pedido ${order.id} de ${order.product_name}?${(order.receipts || []).length ? " As entradas já registradas continuarão no estoque e no histórico." : ""}`, { title: "Excluir pedido", confirmLabel: "Excluir" }))) return;
          try { await post(`/api/supplier-orders/${encodeURIComponent(order.id)}`, {}, "DELETE"); toast("Pedido excluído"); await load(); } catch (error) { toast(error.message); }
        });
      }
      function bindSupplierOrders() {
        const form = $("#supplierOrderForm");
        if (!form || form.dataset.bound) return;
        form.dataset.bound = "1";
        const date = form.elements.order_date;
        if (date && !date.value) date.value = todayInputValue();
        fillSupplierOrderSupplierSelect();
        $("#supplierOrderType")?.addEventListener("change", () => { fillSupplierOrderProductSelect(); renderSupplierDynamicPlanPreview(); });
        $("#supplierOrderProductSearch")?.addEventListener("change", renderSupplierDynamicPlanPreview);
        $("#supplierOrderQuantity")?.addEventListener("input", renderSupplierDynamicPlanPreview);
        $("#supplierOrdersSearch")?.addEventListener("input", renderSupplierOrders);
        $("#supplierOrdersStatus")?.addEventListener("change", renderSupplierOrders);
        $("#supplierOrdersType")?.addEventListener("change", renderSupplierOrders);
        fillSupplierOrderProductSelect();
        form.onsubmit = async (event) => {
          event.preventDefault();
          const f = new FormData(form);
          try {
            await post("/api/supplier-orders", { supplier: f.get("supplier"), order_date: f.get("order_date"), external_id: f.get("external_id"), note: f.get("note"), product_type: f.get("product_type"), product_id: f.get("product_id"), quantity_ordered: Number(f.get("quantity_ordered")) });
            form.reset();
            date.value = todayInputValue();
            fillSupplierOrderProductSelect();
            renderSupplierDynamicPlanPreview();
            toast("Compra cadastrada no estoque fornecedor");
            await load();
          } catch (error) { toast(error.message); }
        };
      }
      function dashboardPeriodLabel(period) {
        return { day: "Hoje", month: "Este mês", year: "Este ano" }[period] || "Este mês";
      }
      function dashboardMovementDate(m) {
        const value = m?.date || m?.created_at || m?.occurred_at;
        const date = value ? new Date(value) : null;
        return date && !Number.isNaN(date.getTime()) ? date : null;
      }
      function dashboardInPeriod(date, period) {
        if (!date) return false;
        const now = new Date();
        if (period === "day") return date.toDateString() === now.toDateString();
        if (period === "year") return date.getFullYear() === now.getFullYear();
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
      function dashboardRankHTML(rows, empty = "Nenhuma movimentação encontrada no período.") {
        const max = Math.max(1, ...rows.map((x) => x.quantity));
        return rows.length ? rows.map((row, index) => `<div class="dashboard-rank-row"><span class="dashboard-rank-position">${index + 1}</span><div class="dashboard-rank-main"><strong>${esc(row.name)}</strong><div class="dashboard-rank-bar"><i style="width:${Math.max(5, Math.round((row.quantity / max) * 100))}%"></i></div></div><b>${row.quantity} un.</b></div>`).join("") : `<div class="dashboard-empty">${empty}</div>`;
      }
      function dashboardTaskItems() {
        const items = [];
        for (const task of D.dynamicTasks || []) if (!task.resolved) items.push({ type: task.type || "Componente faltante", text: task.text || task.product_name || "Pendência dinâmica", category: "dynamic" });
        for (const family of D.outsourcing || []) {
          if (["counted", "sent", "returned"].includes(family.status)) items.push({ type: "Terceirização", text: `${family.id}: aguardando ${family.status === "counted" ? "envio" : family.status === "sent" ? "retorno" : "conferência"}.`, category: "outsourcing" });
          for (const warning of family.warnings || []) if (!warning.resolved) items.push({ type: "Divergência", text: `${warning.item_product_name}: ${warning.message}`, category: "warning" });
        }
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (const lot of D.expiryLots || []) if (!lot.resolved && Number(lot.quantity || 0) > 0) { const p = D.products.find((x) => x.id === lot.product_id), expiry = new Date(`${lot.expiry_date}T00:00:00`), days = Math.ceil((expiry - today) / 86400000); if (p && days <= Number(p.expiry_alert_days ?? 30)) items.push({ type: days < 0 ? "Produto vencido" : "Produto vencendo", text: `${p.name}: ${days < 0 ? `vencido há ${Math.abs(days)} dia(s)` : `vence em ${days} dia(s)`}.`, category: "expiry" }); }
        return items;
      }
      function dashboardRange(period, reference) {
        const end = new Date(reference || new Date()); end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        if (period === "day") start.setHours(0, 0, 0, 0);
        else if (period === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); start.setHours(0, 0, 0, 0); }
        else if (period === "prev_month") { start.setMonth(start.getMonth() - 1, 1); start.setHours(0, 0, 0, 0); end.setDate(0); }
        else if (period === "quarter") { start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1); start.setHours(0, 0, 0, 0); }
        else if (period === "year") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
        else { start.setDate(1); start.setHours(0, 0, 0, 0); }
        return { start, end };
      }
      function dashboardInRange(date, range) { return date && date >= range.start && date <= range.end; }
      function dashboardOutLines(movements, range) {
        const rows = [];
        for (const m of movements) { const date = dashboardMovementDate(m); if (!dashboardInRange(date, range) || !["OUT", "KIT_OUT", "DYNAMIC_OUT", "OUTSOURCING_OUT"].includes(m.type)) continue; for (const line of m.lines || []) rows.push({ ...line, movement: m, quantity: Math.abs(Number(line.quantity || 0)) }); }
        return rows.filter((x) => x.quantity > 0);
      }
      function dashboardMoney(n) { return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }
      function dashboardBarHTML(rows, color = "blue") { const max = Math.max(1, ...rows.map((x) => x.value)); return rows.length ? rows.map((x, i) => `<div class="command-bar-row"><span class="command-rank">${i + 1}</span><div class="command-bar-main"><strong title="${esc(x.name)}">${esc(x.name)}</strong><div class="command-bar-track"><i class="${color}" style="width:${Math.max(4, Math.round(x.value / max * 100))}%"></i></div></div><b>${x.value}</b></div>`).join("") : `<div class="command-empty">Sem dados no período.</div>`; }
      function dashboardLineSVG(values) { const w = 700, h = 220, pad = 28, max = Math.max(1, ...values.map((x) => x.value)), points = values.map((x, i) => `${pad + i * ((w - pad * 2) / Math.max(1, values.length - 1))},${h - pad - (x.value / max) * (h - pad * 2)}`).join(" "); return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Saídas por mês"><path class="command-grid-line" d="M${pad} ${pad}H${w - pad}M${pad} ${(h - pad) / 2}H${w - pad}M${pad} ${h - pad}H${w - pad}"/><polyline class="command-line-area" points="${pad},${h - pad} ${points} ${w - pad},${h - pad}"/><polyline class="command-line" points="${points}"/>${values.map((x, i) => { const px = pad + i * ((w - pad * 2) / Math.max(1, values.length - 1)), py = h - pad - (x.value / max) * (h - pad * 2); return `<circle cx="${px}" cy="${py}" r="4"/><text x="${px}" y="${h - 7}" text-anchor="middle">${x.label}</text>`; }).join("")}</svg>`; }
      function dashboardTreeHTML(product, warehouseId, parent = "", depth = 0) { return (product.nodes || []).filter((node) => String(node.parent_id || "") === String(parent)).map((node) => { const stock = dynamicStockForNode(node, warehouseId), required = Number(node.quantity_per_parent || 1), ok = stock >= required, children = dashboardTreeHTML(product, warehouseId, node.id, depth + 1); return `<div class="command-tree-node" style="--tree-depth:${depth}"><div><span class="command-tree-branch">${depth ? "└─" : ""}</span><strong>${esc(node.name)}</strong><small>${stock} ${esc(node.unit || "UN")} · x${required}/conjunto · ${esc(node.stock_group_id || node.id)}</small></div><b class="${ok ? "ok" : "bad"}">${ok ? "OK" : `Faltam ${Math.max(0, required - stock)}`}</b></div>${children}`; }).join(""); }
      function dynamicStockForNode(node, warehouseId) { return (D.dynamicStock || []).filter((x) => x.group_id === (node.stock_group_id || node.id) && (!warehouseId || warehouseId === "all" || x.warehouse_id === warehouseId)).reduce((sum, x) => sum + Number(x.quantity || 0), 0); }
      function dashboardDynamicCard(product, warehouseId) { const base = dynamicBaseNode(product) || product.nodes?.[0], baseQty = base ? dynamicStockForNode(base, warehouseId) : 0, capacities = (product.nodes || []).map((node) => Math.floor(dynamicStockForNode(node, warehouseId) / Math.max(1, Number(node.quantity_per_parent || 1)))), capacity = capacities.length ? Math.min(...capacities) : 0, shortages = (product.nodes || []).filter((node) => dynamicStockForNode(node, warehouseId) < Number(node.quantity_per_parent || 1)); return `<article class="command-dynamic-card"><div class="command-dynamic-head"><div><strong>${esc(product.name)}</strong><small>${esc(product.sku || "Sem SKU")} · ${product.nodes?.length || 0} componentes</small></div><span class="command-pill ${shortages.length ? "warning" : "success"}">${shortages.length ? `${shortages.length} alerta(s)` : "Composição OK"}</span></div><div class="command-dynamic-meta"><span>Base disponível <b>${baseQty} ${esc(product.unit || "UN")}</b></span><span>Capacidade de montagem <b>${capacity} conjunto(s)</b></span></div><div class="command-tree">${dashboardTreeHTML(product, warehouseId)}</div><div class="command-sim"><div><strong>Simular produção</strong><span>Montar <b class="command-sim-value">1</b> conjunto(s)</span></div><input class="command-sim-slider" data-product="${esc(product.id)}" type="range" min="1" max="50" value="1"><div class="command-sim-result" data-result="${esc(product.id)}"></div></div></article>`; }
      // ===== Dashboard v2: visão completa; blocos de add-on só aparecem quando o add-on está ligado =====
      const VD_ADDONS = { "expiry-control": "Validade", "supplier-orders": "Fornecedor", outsourcing: "Terceirização", marketplaces: "Marketplaces", kits: "Kits", "dynamic-products": "Dinâmicos" };
      const VD_MS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      let vdFilter = "all";
      function vdDate(m) {
        const v = m?.date || m?.created_at || m?.occurred_at; if (!v) return null;
        const d = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T12:00:00`) : new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      function vdRange() {
        const sel = $("#dashboardPeriod")?.value || "30", today = new Date(); today.setHours(0, 0, 0, 0);
        let from = new Date(today), to = new Date(today);
        if (sel === "custom") { const f = $("#dashboardFrom")?.value, t = $("#dashboardTo")?.value; if (f && t) { from = new Date(`${f}T00:00:00`); to = new Date(`${t}T00:00:00`); if (from > to) [from, to] = [to, from]; } }
        else if (sel === "month") from.setDate(1);
        else if (sel === "prev_month") { from.setMonth(from.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); }
        else if (sel === "quarter") from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1);
        else if (sel === "year") from.setMonth(0, 1);
        else from.setDate(from.getDate() - (Number(sel) - 1));
        const iso = (d) => d.toLocaleDateString("sv-SE");
        if (sel !== "custom") { if ($("#dashboardFrom")) $("#dashboardFrom").value = iso(from); if ($("#dashboardTo")) $("#dashboardTo").value = iso(to); }
        if ($("#dashboardFrom")) $("#dashboardFrom").disabled = $("#dashboardTo").disabled = sel !== "custom";
        const days = Math.max(1, Math.round((to - from) / 86400000) + 1), end = new Date(to); end.setHours(23, 59, 59, 999);
        const pstart = new Date(from); pstart.setDate(pstart.getDate() - days);
        return { start: from, end, days, pstart, pend: new Date(from.getTime() - 1), today };
      }
      function vdGo(view) {
        const btn = $(`.sidebar button[data-view="${view}"]`);
        if (btn) return btn.click();
        const target = $("#" + view); if (!target) return;
        $$(".view").forEach((v) => v.classList.remove("active")); target.classList.add("active");
        $$("nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
      }
      function renderDashboard() {
        const root = $("#dashboardV2"); if (!root) return;
        const R = vdRange(), wid = $("#globalWarehouse")?.value || "all", cat = $("#dashboardCategory")?.value || "", cmpOn = ($("#dashboardCompare")?.value || "previous") !== "none";
        const on = (k) => add11IsEnabled(k), fq = (n) => Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
        const fd = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), fdate = (v) => { const d = new Date(`${String(v).slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR"); };
        const categories = [...new Set([...(D.categories || []).map((c) => c.name), ...(D.products || []).map((p) => p.category).filter(Boolean)])].sort();
        const catSel = $("#dashboardCategory"); if (catSel && catSel.dataset.n !== String(categories.length)) { catSel.innerHTML = '<option value="">Todas as categorias</option>' + categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(""); catSel.dataset.n = String(categories.length); catSel.value = cat; }
        const ps = (D.products || []).filter((p) => !cat || (p.category || "") === cat), byId = new Map((D.products || []).map((p) => [p.id, p]));
        const stock = (p) => qty(p.id, wid), cls = (p) => { const s = stock(p), mi = Number(p.min || 0), ma = Number(p.max || 0); return s <= 0 ? "zero" : mi > 0 && s < mi ? "low" : ma > 0 && s > ma ? "high" : "ok"; };
        // fluxos de entrada/saída (um por produto), com kits abertos em componentes
        const flows = [], months = new Set(), kitSold = new Map(); let kitTotal = 0;
        for (const m of D.movements || []) {
          const date = vdDate(m); if (!date) continue; months.add(date.getFullYear() * 12 + date.getMonth());
          const kind = ["OUT", "KIT_OUT", "DYNAMIC_OUT", "OUTSOURCING_OUT"].includes(m.type) ? "out" : ["IN", "DYNAMIC_IN", "OUTSOURCING_IN"].includes(m.type) ? "in" : null; if (!kind) continue;
          if (wid !== "all" && m.warehouse_id && m.warehouse_id !== wid) continue;
          const t = date.getTime();
          for (const l of m.lines || []) {
            const lq = Math.abs(Number(l.quantity || 0));
            if (m.type === "KIT_OUT" && t >= R.start.getTime() && t <= R.end.getTime()) { kitSold.set(l.kit_id, (kitSold.get(l.kit_id) || 0) + lq); kitTotal += lq; }
            const items = Array.isArray(l.kit_items) && l.kit_items.length ? l.kit_items.map((i) => ({ pid: i.product_id, q: Math.abs(Number(i.quantity || 0)) * lq })) : [{ pid: l.product_id || null, q: lq }];
            for (const it of items) { if (!(it.q > 0)) continue; const p = it.pid ? byId.get(it.pid) : null; if (cat && (!p || (p.category || "") !== cat)) continue; flows.push({ t, k: kind, pid: it.pid, q: it.q }); }
          }
        }
        const s0 = R.start.getTime(), e0 = R.end.getTime(), ps0 = R.pstart.getTime(), pe0 = R.pend.getTime();
        const T = { o: 0, i: 0, po: 0, pi: 0 }, outBy = new Map(), lastOut = new Map(), M = new Map(), nm = Array(12).fill(0);
        for (const k of months) nm[k % 12]++;
        for (const f of flows) {
          if (f.t >= s0 && f.t <= e0) { if (f.k === "out") { T.o += f.q; if (f.pid) outBy.set(f.pid, (outBy.get(f.pid) || 0) + f.q); } else T.i += f.q; }
          else if (f.t >= ps0 && f.t <= pe0) { if (f.k === "out") T.po += f.q; else T.pi += f.q; }
          if (f.k === "out" && f.pid) { lastOut.set(f.pid, Math.max(lastOut.get(f.pid) || 0, f.t)); const a = M.get(f.pid) || Array(12).fill(0); a[new Date(f.t).getMonth()] += f.q; M.set(f.pid, a); }
        }
        M.forEach((a) => a.forEach((v, i) => { a[i] = v / Math.max(1, nm[i]); }));
        const hist = months.size ? Math.max(...months) - Math.min(...months) + 1 : 0, curM = new Date().getMonth();
        const prevOk = cmpOn && (T.po > 0 || T.pi > 0);
        const dl = (c, p, inv) => { if (!prevOk || !p) return ""; const v = (c - p) / p * 100, up = v >= 0; return `<span class="vd-dl ${Math.abs(v) < .5 ? "vd-nt" : (inv ? !up : up) ? "vd-up" : "vd-dn"}">${up ? "▲" : "▼"} ${Math.abs(v).toFixed(1).replace(".", ",")}%</span>`; };
        const tg = (k) => `<span class="vd-tag vd-t-b">${VD_ADDONS[k]}</span>`;
        // dados dos add-ons
        const todayT = R.today.getTime(), lots = on("expiry-control") ? (D.expiryLots || []).filter((l) => !l.resolved && Number(l.quantity || 0) > 0).map((l) => ({ l, p: byId.get(l.product_id), days: Math.ceil((new Date(`${l.expiry_date}T00:00:00`) - R.today) / 86400000) })).filter((x) => x.p && !Number.isNaN(x.days) && (!cat || x.p.category === cat)) : [];
        const orders = on("supplier-orders") ? (D.supplierOrders || []).filter((o) => !cat || (byId.get(o.product_id)?.category || "") === cat).map((o) => { const ord = Number(o.quantity_ordered || 0), rec = Number(o.quantity_received || 0), inc = !!o.stock_included_at, exp = o.expected_date ? Math.round((new Date(`${o.expected_date}T00:00:00`) - R.today) / 86400000) : null; return { o, ord, rec, inc, exp, late: !inc && rec < ord && exp !== null && exp < 0, over: rec > ord, full: !inc && rec >= ord && ord > 0 }; }) : [];
        const fams = on("outsourcing") ? (D.outsourcing || []) : [], waiting = fams.filter((f) => ["counted", "sent", "returned"].includes(f.status));
        const warns = fams.flatMap((f) => (f.warnings || []).filter((w) => !w.resolved).map((w) => ({ f, w })));
        const kits = on("kits") ? (D.kits || []).map((k) => { const its = (k.items || []).filter((i) => i.product_id); const caps = its.map((i) => ({ p: byId.get(i.product_id), c: Math.floor(qty(i.product_id, wid) / Math.max(1e-9, Number(i.quantity || 1))) })); const lim = caps.sort((a, b) => a.c - b.c)[0]; return { k, cap: lim ? Math.max(0, lim.c) : 0, lim: lim?.p?.name || "", sold: kitSold.get(k.id) || 0 }; }) : [];
        const dyn = on("dynamic-products") ? (D.dynamicProducts || []) : [], dynTasks = on("dynamic-products") ? (D.dynamicTasks || []).filter((t) => !t.resolved) : [];
        const mkt = on("marketplaces") ? (D.marketplaceEvents || []) : [], mktIn = mkt.filter((e) => { const d = vdDate(e); return d && d >= R.start && d <= R.end; }), mktName = (p) => /mercado/i.test(p) ? "Mercado Livre" : /shopee/i.test(p) ? "Shopee" : String(p || "Canal");
        // decisões
        const dec = [], add = (t, sv, ti, de, go) => dec.push({ t, sv, ti, de, go });
        for (const p of ps) { const s = stock(p), mi = Number(p.min || 0), ma = Number(p.max || 0), c = cls(p);
          if (c === "zero" && (mi > 0 || lastOut.has(p.id))) add("e", 0, p.name, `Sem estoque${mi ? ` · mínimo ${fq(mi)}` : ""}`, "dashboard");
          else if (c === "low") add("e", 1, p.name, `${fq(s)} ${p.unit || "UN"} · mínimo ${fq(mi)}`, "dashboard");
          else if (c === "high") add("e", 2, `${p.name}: acima do máximo`, `${fq(s)} ${p.unit || "UN"} · máximo ${fq(ma)}`, "dashboard");
          const a = M.get(p.id); if (a && hist >= 12) { const av = a.reduce((x, y) => x + y, 0) / 12; for (let k = 1; k <= 3; k++) { const m = (curM + k) % 12; if (a[m] >= Math.max(5, av * 1.8) && a[m] > a[curM] * 1.5) { add("s", s < a[m] * .5 ? 1 : 2, `${p.name}: pico de ${VD_MS[m]} se aproxima`, `Média de ${fq(a[m])} saídas naquele mês · estoque atual ${fq(s)}`, "dashboard"); break; } } } }
        lots.filter((x) => x.days < 0).forEach((x) => add("expiry-control", 0, `${x.p.name}: lote vencido`, `${fq(x.l.quantity)} ${x.p.unit || "UN"} vencidas há ${-x.days} dia(s)`, "expiry-control"));
        lots.filter((x) => x.days >= 0 && x.days <= Number(x.p.expiry_alert_days ?? 30) && x.days <= 7).forEach((x) => add("expiry-control", 1, `${x.p.name}: vence em ${x.days} dia(s)`, `${fq(x.l.quantity)} ${x.p.unit || "UN"} no lote`, "expiry-control"));
        orders.filter((x) => x.late).forEach((x) => { const p = byId.get(x.o.product_id), zero = p && stock(p) <= 0; add("supplier-orders", zero ? 0 : 1, `${x.o.id}: entrega atrasada ${-x.exp} dia(s)`, `${x.o.supplier || "Fornecedor"} · ${x.o.product_name || ""} · faltam ${fq(x.ord - x.rec)}${zero ? " · produto está sem estoque" : ""}`, "supplier-orders"); });
        orders.filter((x) => x.over).forEach((x) => add("supplier-orders", 1, `${x.o.id}: veio ${fq(x.rec - x.ord)} acima do pedido`, `${x.o.supplier || "Fornecedor"} · ${x.o.product_name || ""} · pedido ${fq(x.ord)}, recebido ${fq(x.rec)}`, "supplier-orders"));
        orders.filter((x) => x.full && !x.over).forEach((x) => add("supplier-orders", 2, `${x.o.id}: 100% recebido, falta incluir no estoque`, `${x.o.supplier || "Fornecedor"} · ${x.o.product_name || ""}`, "supplier-orders"));
        warns.forEach((x) => add("outsourcing", 1, `${x.f.id}: divergência`, `${x.w.item_product_name || ""} ${x.w.message || ""}`.trim(), "outsourcing"));
        waiting.forEach((f) => add("outsourcing", 2, `${f.id}: aguardando ${f.status === "counted" ? "envio" : f.status === "sent" ? "retorno" : "conferência"}`, f.name || f.supplier || "", "outsourcing"));
        const pend = mkt.filter((e) => e.status === "pending_mapping"), errs = mkt.filter((e) => e.status === "error");
        if (pend.length) add("marketplaces", 1, `${pend.length} pedido(s) sem vínculo`, "Mapeie os itens para baixar o estoque", "marketplaces");
        if (errs.length) add("marketplaces", 1, `${errs.length} pedido(s) com erro`, "Revise na tela de Conectar APIs", "marketplaces");
        kits.filter((x) => x.cap === 0).forEach((x) => add("kits", 0, `${x.k.name}: não dá para montar`, x.lim ? `Falta componente: ${x.lim}` : "Kit sem composição", "kits"));
        dynTasks.slice(0, 5).forEach((t) => add("dynamic-products", 1, t.type || "Componente faltante", t.text || t.product_name || "Pendência dinâmica", "dynamic-products"));
        dec.sort((a, b) => a.sv - b.sv);
        const names = { all: "Tudo", e: "Estoque", s: "Sazonal", ...VD_ADDONS }, cc = { all: dec.length }; dec.forEach((d) => { cc[d.t] = (cc[d.t] || 0) + 1; });
        const chips = ["all", ...new Set(dec.map((d) => d.t))]; if (!chips.includes(vdFilter)) vdFilter = "all";
        const all = dec.filter((d) => vdFilter === "all" || d.t === vdFilter), perArea = {}, rows = vdFilter === "all" ? all.filter((d) => (perArea[d.t] = (perArea[d.t] || 0) + 1) <= 2) : all, shown = rows.slice(0, 16);
        const decH = `<div class="vd-panel vd-decide"><div class="vd-ph"><div><h3>Precisa da sua decisão agora</h3><p class="vd-s">${dec.filter((d) => d.sv === 0).length} urgente(s) · ordenado do mais grave para o menos grave</p></div></div><div class="vd-chips">${chips.map((k) => `<button type="button" class="vd-chip" data-vdf="${esc(k)}" aria-pressed="${vdFilter === k}">${names[k]}<i>${cc[k]}</i></button>`).join("")}</div>${shown.map((d) => `<div class="vd-item"><span class="vd-ic ${d.sv === 0 ? "vd-c" : d.sv === 1 ? "vd-w" : "vd-i"}">${d.sv === 0 ? "!" : d.sv === 1 ? "▲" : "•"}</span><div><b>${esc(d.ti)}</b><small>${esc(d.de)}</small></div><span class="vd-tag ${d.t === "e" || d.t === "s" ? "vd-t-m" : "vd-t-b"}">${names[d.t]}</span><button type="button" class="vd-btn" data-go="${d.go}">Abrir</button></div>`).join("") || '<div class="vd-empty">Nenhum aviso. Tudo em dia.</div>'}${all.length > shown.length ? `<p class="vd-s" style="margin:8px 0 0">+ ${all.length - shown.length} aviso(s) a mais. Use os filtros acima para ver cada área completa.</p>` : ""}</div>`;
        // KPIs
        const cnt = { zero: 0, low: 0, ok: 0, high: 0 }; ps.forEach((p) => cnt[cls(p)]++);
        const stk = ps.reduce((s, p) => s + stock(p), 0), daily = T.o / R.days, cov = daily ? Math.round(stk / daily) : null, ph = ps.length ? Math.round(cnt.ok / ps.length * 100) : 0;
        const kc = (c, l, v, sub, d, k) => `<div class="vd-kpi ${c}"><small>${l}${k ? `<em>${VD_ADDONS[k]}</em>` : ""}</small><strong>${v}</strong><span>${d || ""}${sub}</span></div>`;
        const kp = [kc("", "Saídas", fq(T.o), "unidades no período", dl(T.o, T.po)), kc("vd-kg", "Entradas", fq(T.i), "unidades recebidas", dl(T.i, T.pi)), kc(T.i >= T.o ? "vd-kg" : "vd-ka", "Saldo (entradas − saídas)", `${T.i - T.o > 0 ? "+" : ""}${fq(T.i - T.o)}`, T.i >= T.o ? "estoque cresceu" : "estoque encolheu"), kc("vd-kp", "Estoque físico", fq(stk), "unidades"), kc(ph >= 80 ? "vd-kg" : "vd-kr", "Saúde do estoque", `${ph}%`, `${cnt.ok} de ${ps.length} produtos normais`), kc("vd-ka", "Cobertura média", cov === null ? "—" : `${cov} d`, cov === null ? "sem saídas no período" : "dias que o estoque dura")];
        if (on("expiry-control")) kp.push(kc("vd-kr", "Vencendo em 30 dias", lots.filter((x) => x.days >= 0 && x.days <= 30).length, `${lots.filter((x) => x.days < 0).length} lote(s) já vencido(s)`, "", "expiry-control"));
        if (on("supplier-orders")) kp.push(kc("vd-ka", "Pedidos de fornecedor", orders.filter((x) => !x.inc).length, `${orders.filter((x) => x.late).length} atrasado(s) · ${orders.filter((x) => x.over).length} com excesso`, "", "supplier-orders"));
        if (on("outsourcing")) kp.push(kc("vd-kp", "Em terceirização", waiting.length, `${warns.length} divergência(s)`, "", "outsourcing"));
        if (on("kits")) kp.push(kc("", "Kits vendidos", fq(kitTotal), "no período", "", "kits"));
        if (on("marketplaces")) kp.push(kc("", "Pedidos dos canais", mktIn.length, `${pend.length} sem vínculo`, "", "marketplaces"));
        if (on("dynamic-products")) kp.push(kc("vd-kp", "Produtos dinâmicos", dyn.length, `${dynTasks.length} pendência(s)`, "", "dynamic-products"));
        // gráfico entradas x saídas
        const step = R.days <= 45 ? 1 : R.days <= 200 ? 7 : 30, bk = [];
        for (let x = R.end.getTime(); x >= s0 - 86399999; x -= step * 86400000) { const hi = x, lo = Math.max(s0, x - step * 86400000 + 1); let o = 0, i = 0; for (const f of flows) if (f.t >= lo && f.t <= hi) { if (f.k === "out") o += f.q; else i += f.q; } bk.unshift({ l: step === 30 ? VD_MS[new Date(lo).getMonth()] : fd(new Date(lo)), o, i }); }
        const mx = Math.max(1, ...bk.map((k) => Math.max(k.o, k.i))), W = 640, sp = (W - 50) / Math.max(1, bk.length), bw = Math.max(3, Math.min(16, sp / 2.4));
        let sv = `<svg viewBox="0 0 ${W} 210" role="img" aria-label="Entradas e saídas">`; for (let g = 0; g <= 4; g++) { const y = 170 - g * 38; sv += `<line x1="40" x2="${W}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".1"/><text x="34" y="${y + 3}" text-anchor="end">${fq(mx * g / 4)}</text>`; }
        bk.forEach((k, i) => { const x = 46 + i * sp; [[k.o, "#22273f", 0], [k.i, "#23936b", bw + 1]].forEach((z) => { const h = z[0] / mx * 152; sv += `<rect x="${x + z[2]}" y="${170 - h}" width="${bw}" height="${h}" rx="2" fill="${z[1]}"><title>${k.l}: ${fq(z[0])} un</title></rect>`; }); if (bk.length <= 14 || i % Math.ceil(bk.length / 12) === 0) sv += `<text x="${x + bw}" y="188" text-anchor="middle">${k.l}</text>`; }); sv += "</svg>";
        const blk = (t, sub, body, right) => `<div class="vd-panel"><div class="vd-ph"><div><h3>${t}</h3><p class="vd-s">${sub}</p></div>${right || ""}</div>${body}</div>`;
        const bar = (n, v, mxv, c, lab) => `<div class="vd-bar"><span title="${esc(n)}">${esc(n)}</span><div class="vd-tr"><i style="width:${mxv ? Math.min(100, v / mxv * 100) : 0}%;background:${c}"></i></div><span>${lab ?? fq(v)}</span></div>`;
        const op = (a, b, tagc, tagt) => `<div class="vd-op"><span>${a}<small>${b}</small></span>${tagt ? `<span class="vd-tag ${tagc}">${tagt}</span>` : ""}</div>`;
        const emp = (t) => `<div class="vd-empty">${t}</div>`;
        const chart = blk("Entradas e saídas", `Unidades por ${step === 1 ? "dia" : step === 7 ? "semana" : "mês"} no período escolhido`, bk.some((k) => k.o || k.i) ? sv : emp("Nenhuma movimentação no período."), `<div class="vd-leg"><span><i style="background:#22273f"></i>Saídas</span><span><i style="background:#23936b"></i>Entradas</span></div>`);
        const HC = { zero: ["Sem estoque", "#f8061b"], low: ["Abaixo do mínimo", "#ec9b17"], ok: ["Normal", "#23936b"], high: ["Acima do máximo", "#2f78d0"] };
        const health = blk("Saúde do estoque", `${ps.length} produto(s) no filtro`, ps.length ? `<div class="vd-stack">${Object.keys(HC).map((k) => `<div style="flex:${cnt[k]};background:${HC[k][1]}" title="${HC[k][0]}: ${cnt[k]}"></div>`).join("")}</div>${Object.keys(HC).map((k) => `<div class="vd-hr"><span><i style="background:${HC[k][1]}"></i>${HC[k][0]}</span><b>${cnt[k]}</b></div>`).join("")}` : emp("Nenhum produto cadastrado."));
        const rk = ps.map((p) => ({ p, v: outBy.get(p.id) || 0 })).sort((a, b) => b.v - a.v), top = rk.filter((x) => x.v > 0).slice(0, 8), lowR = rk.filter((x) => stock(x.p) > 0).slice(-5).reverse();
        const topB = blk("Produtos que mais saem", `Top 8 por unidades, de ${fd(R.start)} a ${fd(R.end)}`, top.map((x) => bar(x.p.name, x.v, top[0].v, "#22273f")).join("") || emp("Sem saídas no período."));
        const lowB = blk("Produtos que menos saem", "Têm estoque e quase não saem no período", lowR.map((x) => bar(x.p.name, x.v, Math.max(1, top[0]?.v || 1), "#98a0bb", `${fq(x.v)} un`)).join("") || emp("Sem dados."));
        const hp = ps.filter((p) => M.has(p.id)).sort((a, b) => M.get(b.id).reduce((s, v) => s + v, 0) - M.get(a.id).reduce((s, v) => s + v, 0)).slice(0, 10);
        const hm = hp.length ? `<div class="vd-scr"><div class="vd-hm"><span></span>${VD_MS.map((m, i) => `<span class="vd-h" style="${i === curM ? "color:#f8061b" : ""}">${m}</span>`).join("")}<span class="vd-h">Pico</span>${hp.map((p) => { const a = M.get(p.id), mm = Math.max(...a), pk = a.indexOf(mm); return `<span class="vd-nm" title="${esc(p.name)}">${esc(p.name)}</span>${a.map((v, i) => `<span class="vd-ce" style="background:rgba(248,6,27,${(.06 + .9 * (mm ? v / mm : 0)).toFixed(2)});${i === curM ? "outline:2px solid #22273f" : ""}" title="${esc(p.name)} em ${VD_MS[i]}: ${fq(v)} un por mês, em média"></span>`).join("")}<span class="vd-pk">${VD_MS[pk]}</span>`; }).join("")}</div></div><p class="vd-s" style="margin:10px 0 0">Média de saídas por mês de calendário. Cor mais forte = mês mais forte do produto. Contorno = mês atual.${hist < 12 ? ` <b>Histórico de só ${hist} mês(es): a sazonalidade fica confiável com 12 meses ou mais.</b>` : ""}</p>` : emp("Ainda não há saídas registradas para calcular sazonalidade.");
        const heat = blk("Sazonalidade: em que meses cada produto sai mais", "Todo o histórico de saídas, sem depender do período escolhido", hm);
        const pk = []; if (hist >= 12) ps.forEach((p) => { const a = M.get(p.id); if (!a) return; const av = a.reduce((x, y) => x + y, 0) / 12; for (let k = 1; k <= 3; k++) { const m = (curM + k) % 12; if (a[m] >= Math.max(5, av * 1.8) && a[m] > a[curM] * 1.5) { pk.push({ p, m, k, v: a[m] }); break; } } });
        const peaks = blk("Próximos picos", "Meses fortes chegando nos próximos 3 meses", pk.sort((x, y) => x.k - y.k).slice(0, 7).map((x) => op(esc(x.p.name), `pico em ${VD_MS[x.m]} · média ${fq(x.v)} un · estoque ${fq(stock(x.p))}`, stock(x.p) < x.v * .5 ? "vd-t-r" : "vd-t-a", stock(x.p) < x.v * .5 ? "repor" : `em ${x.k} mês`)).join("") || emp(hist < 12 ? "Precisa de 12 meses de histórico para prever picos." : "Nenhum pico à vista."));
        const Tt = rk.reduce((s, x) => s + x.v, 0) || 1; let acm = 0; const gp = { A: [], B: [], C: [] }; rk.filter((x) => x.v > 0).forEach((x) => { const k = acm / Tt < .8 ? "A" : acm / Tt < .95 ? "B" : "C"; gp[k].push(x); acm += x.v; });
        const cc2 = { A: "#f8061b", B: "#ec9b17", C: "#98a0bb" }, sh = (k) => gp[k].reduce((s, x) => s + x.v, 0) / Tt * 100;
        const abc = blk("Curva ABC", "Quanto cada grupo representa das saídas do período", top.length ? `<div class="vd-abc">${Object.keys(gp).map((k) => `<div style="flex:${Math.max(sh(k), 9)};background:${cc2[k]};color:${k === "A" ? "#fff" : "#22273f"}">${k}</div>`).join("")}</div>${Object.keys(gp).map((k) => op(`<b>Classe ${k}</b>`, `${gp[k].length} produto(s)${k === "A" ? ": " + gp[k].slice(0, 3).map((x) => esc(x.p.name)).join(", ") : ""}`, "", "").replace("</span></div>", `</span><b>${Math.round(sh(k))}%</b></div>`)).join("")}` : emp("Sem saídas no período."));
        const dead = ps.filter((p) => stock(p) > 0).map((p) => ({ p, d: lastOut.has(p.id) ? Math.floor((todayT - lastOut.get(p.id)) / 86400000) : null })).filter((x) => x.d === null || x.d >= 60).sort((a, b) => (b.d ?? 99999) - (a.d ?? 99999)).slice(0, 7);
        const deadB = blk("Estoque parado", "Com estoque e sem saída há 60 dias ou mais", dead.map((x) => op(esc(x.p.name), `${fq(stock(x.p))} ${esc(x.p.unit || "UN")} paradas`, "vd-t-a", x.d === null ? "nunca saiu" : `${x.d} dias`)).join("") || emp("Nada parado."));
        const cm2 = {}; ps.forEach((p) => { const c = p.category || "Sem categoria"; cm2[c] = (cm2[c] || 0) + stock(p); }); const cr = Object.entries(cm2).sort((a, b) => b[1] - a[1]);
        const catB = blk("Estoque por categoria", "Unidades físicas", cr.map((x) => bar(x[0], x[1], cr[0][1], "#2f78d0")).join("") || emp("Sem dados."));
        const cv = ps.filter((p) => (outBy.get(p.id) || 0) > 0).map((p) => ({ p, d: Math.round(stock(p) / ((outBy.get(p.id) || 1) / R.days)) })).sort((a, b) => a.d - b.d).slice(0, 6);
        const covB = blk("Cobertura e reposição", "Por quantos dias o estoque dura no ritmo do período", cv.map((x) => { const ma = Number(x.p.max || 0), want = ma > 0 ? Math.max(0, ma - stock(x.p)) : null, ord = orders.filter((z) => z.o.product_id === x.p.id && !z.inc).reduce((s, z) => s + Math.max(0, z.ord - z.rec), 0); return bar(x.p.name, Math.min(x.d, 60), 60, x.d < 7 ? "#f8061b" : x.d < 20 ? "#ec9b17" : "#23936b", x.d <= 0 ? "zerado" : `${x.d} d`) + `<div class="vd-sub">${fq(stock(x.p))} ${esc(x.p.unit || "UN")}${want !== null ? ` · para o máximo faltam ${fq(want)}` : ""}${on("supplier-orders") && ord ? ` · ${fq(ord)} já pedido` : ""}</div>`; }).join("") || emp("Sem saídas no período para estimar a cobertura."));
        const TL = { IN: "Entrada", OUT: "Saída", TRANSFER: "Transferência", KIT_OUT: "Saída de kit", DYNAMIC_IN: "Entrada dinâmica", DYNAMIC_OUT: "Saída dinâmica", OUTSOURCING_IN: "Retorno terceirizado", OUTSOURCING_OUT: "Envio terceirizado" };
        const okT = (t) => !(t === "KIT_OUT" && !on("kits")) && !(/^OUTSOURCING/.test(t) && !on("outsourcing")) && !(/^DYNAMIC/.test(t) && !on("dynamic-products"));
        const recent = blk("Movimentações recentes", "Últimos lançamentos", (D.movements || []).filter((m) => okT(m.type)).slice(0, 6).map((m) => { const l = (m.lines || [])[0] || {}, d = vdDate(m), n = l.product_name || byId.get(l.product_id)?.name || m.product_name || "Movimentação", q = (m.lines || []).reduce((s, x) => s + Math.abs(Number(x.quantity || 0)), 0); return op(esc(n) + ((m.lines || []).length > 1 ? ` +${m.lines.length - 1}` : ""), `${TL[m.type] || esc(m.type)} · ${d ? fd(d) : ""}`, "", "").replace("</span></div>", `</span><b>${["OUT", "KIT_OUT", "DYNAMIC_OUT", "OUTSOURCING_OUT"].includes(m.type) ? "−" : ["IN", "DYNAMIC_IN", "OUTSOURCING_IN"].includes(m.type) ? "+" : ""}${fq(q)}</b></div>`); }).join("") || emp("Nenhuma movimentação ainda."));
        // blocos de add-on
        const sec = (t, k, html) => (k && !on(k)) ? "" : `<h2 class="vd-sec">${t}${k ? " " + tg(k) : ""}</h2>${html}`;
        const lv = lots.filter((x) => x.days < 0), l7 = lots.filter((x) => x.days >= 0 && x.days <= 7), l30 = lots.filter((x) => x.days > 7 && x.days <= 30);
        const mini = (a) => `<div class="vd-mini">${a.map((x) => `<div><strong${x[2] ? ` style="color:${x[2]}"` : ""}>${x[0]}</strong><small>${x[1]}</small></div>`).join("")}</div>`;
        const vB = blk("Lotes e validade", "Lotes com saldo registrado", mini([[lv.length, "Vencidos", "#f8061b"], [l7.length, "Em 7 dias", "#b87400"], [l30.length, "8 a 30 dias"], [lots.length, "Lotes ativos"]]) + ([...lv, ...l7, ...l30].sort((a, b) => a.days - b.days).slice(0, 5).map((x) => op(esc(x.p.name), `${fq(x.l.quantity)} ${esc(x.p.unit || "UN")} · ${fdate(x.l.expiry_date)}`, x.days < 0 ? "vd-t-r" : x.days <= 7 ? "vd-t-a" : "vd-t-m", x.days < 0 ? `vencido há ${-x.days} d` : `em ${x.days} d`)).join("") || emp("Nenhum lote vencendo.")), `<button type="button" class="vd-btn" data-go="expiry-control">Abrir</button>`);
        const stt = (x) => x.inc ? ["concluído", "vd-t-g"] : x.over ? [`acima +${fq(x.rec - x.ord)}`, "vd-t-r"] : x.full ? ["falta incluir", "vd-t-b"] : x.late ? ["atrasado", "vd-t-r"] : x.rec > 0 ? ["parcial", "vd-t-a"] : ["aberto", "vd-t-m"];
        const fB1 = blk("Pedidos de fornecedor", "Situação de cada pedido", orders.length ? mini([[orders.filter((x) => !x.inc).length, "Em aberto"], [orders.filter((x) => x.late).length, "Atrasados", "#f8061b"], [fq(orders.filter((x) => x.over).reduce((s, x) => s + x.rec - x.ord, 0)), "Un. acima do pedido", "#f8061b"], [orders.filter((x) => x.full && !x.over).length, "Falta incluir"]]) + `<div class="vd-scr"><table class="vd-table"><thead><tr><th>Pedido</th><th>Fornecedor · produto</th><th>Pedido</th><th>Recebido</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>${[...orders].sort((a, b) => (stt(a)[1] === "vd-t-g") - (stt(b)[1] === "vd-t-g") || (a.exp ?? 9e4) - (b.exp ?? 9e4)).slice(0, 12).map((x) => `<tr><td>${esc(x.o.id)}</td><td><b>${esc(x.o.supplier || "—")}</b><br><span class="vd-mut">${esc(x.o.product_name || "")}</span></td><td>${fq(x.ord)}</td><td>${fq(x.rec)}</td><td>${x.exp === null ? "—" : x.exp < 0 ? `${-x.exp} d atrás` : `em ${x.exp} d`}</td><td><span class="vd-tag ${stt(x)[1]}">${stt(x)[0]}</span></td></tr>`).join("")}</tbody></table></div>` : emp("Nenhum pedido de fornecedor."), `<button type="button" class="vd-btn" data-go="supplier-orders">Abrir</button>`);
        const fs = {}; orders.forEach((x) => { const n = x.o.supplier || "Sem fornecedor", a = fs[n] ||= { n: 0, l: 0, o: 0 }; a.n++; if (x.late) a.l++; if (x.over) a.o++; });
        const fB2 = blk("Fornecedores", "Pontualidade e excessos", Object.entries(fs).map(([n, v]) => { const pc = Math.round((1 - v.l / v.n) * 100); return op(esc(n), `${v.n} pedido(s) · ${v.l} atrasado(s) · ${v.o} com excesso`, pc >= 90 ? "vd-t-g" : pc >= 60 ? "vd-t-a" : "vd-t-r", `${pc}% no prazo`); }).join("") || emp("Sem dados."));
        const stL = { counted: "Contagem", sent: "Enviado", returned: "Retorno" }, oB = blk("Terceirização", "Famílias por etapa", mini([[fams.filter((f) => f.status === "counted").length, "Contagem"], [fams.filter((f) => f.status === "sent").length, "Enviado"], [fams.filter((f) => f.status === "returned").length, "Retorno"], [fams.filter((f) => !stL[f.status]).length, "Concluído"]]) + (warns.slice(0, 3).map((x) => op(esc(x.f.id), esc(`${x.w.item_product_name || ""} ${x.w.message || ""}`), "vd-t-r", "divergência")).join("") + waiting.slice(0, 4).map((f) => op(esc(f.id), esc(f.name || f.supplier || ""), "vd-t-a", stL[f.status])).join("") || emp("Nada pendente.")), `<button type="button" class="vd-btn" data-go="outsourcing">Abrir</button>`);
        const kB = blk("Kits", "Vendidos no período e capacidade de montagem", kits.map((x) => op(esc(x.k.name), `${fq(x.sold)} vendido(s)${x.lim ? ` · limita: ${esc(x.lim)}` : ""}`, x.cap === 0 ? "vd-t-r" : x.cap < 30 ? "vd-t-a" : "vd-t-g", x.cap === 0 ? "não monta" : `${x.cap} montáveis`)).join("") || emp("Nenhum kit cadastrado."), `<button type="button" class="vd-btn" data-go="kits">Abrir</button>`);
        const wh = wid === "all" ? "" : wid, dB = blk("Produtos dinâmicos", "Composição e pendências", dyn.slice(0, 4).map((p) => dashboardDynamicCard(p, wid)).join("") + (dynTasks.length ? op("Pendências de componente", `${dynTasks.length} aberta(s)`, "vd-t-a", String(dynTasks.length)) : "") || emp("Nenhum produto dinâmico."), `<button type="button" class="vd-btn" data-go="dynamic-products">Abrir</button>`);
        const prov = {}; mktIn.forEach((e) => { const n = mktName(e.provider); prov[n] = (prov[n] || 0) + 1; }); const pm = Math.max(1, ...Object.values(prov));
        const mB = blk("Canais conectados", "Pedidos recebidos no período", (Object.entries(prov).map(([n, v]) => bar(n, v, pm, "#2f78d0", `${v} ped.`)).join("") || emp("Nenhum pedido no período.")) + (pend.length || errs.length ? op("Precisam de atenção", `${pend.length} sem vínculo · ${errs.length} com erro`, "vd-t-a", String(pend.length + errs.length)) : ""), `<button type="button" class="vd-btn" data-go="marketplaces">Abrir</button>`);
        $("#dashboardRangeInfo").textContent = `${R.start.toLocaleDateString("pt-BR")} a ${new Date(R.end).toLocaleDateString("pt-BR")} · ${R.days} dia(s)${wid === "all" ? "" : ` · estoque: ${wName(wid)}`}${cmpOn ? ` · comparado com os ${R.days} dias anteriores${prevOk ? "" : " (sem movimentos nesse intervalo)"}` : ""}`;
        root.innerHTML = `<h2 class="vd-sec">Visão geral</h2>${decH}<div style="height:14px"></div><div class="vd-kpis">${kp.join("")}</div><h2 class="vd-sec">Movimentação</h2><div class="vd-grid vd-c2">${chart}${health}</div><div class="vd-grid vd-c2e">${topB}${lowB}</div><h2 class="vd-sec">Sazonalidade e giro</h2><div class="vd-grid vd-c2">${heat}${peaks}</div><div class="vd-grid vd-c3">${abc}${deadB}${catB}</div><div class="vd-grid vd-c2">${covB}${recent}</div>${sec("Validade", "expiry-control", `<div class="vd-grid vd-c1">${vB}</div>`)}${sec("Estoque fornecedor", "supplier-orders", `<div class="vd-grid vd-c2">${fB1}${fB2}</div>`)}${sec("Terceirização", "outsourcing", `<div class="vd-grid vd-c1">${oB}</div>`)}${on("kits") || on("dynamic-products") ? `<h2 class="vd-sec">Kits e produtos dinâmicos</h2><div class="vd-grid ${on("kits") && on("dynamic-products") ? "vd-c2e" : "vd-c1"}">${on("kits") ? kB : ""}${on("dynamic-products") ? dB : ""}</div>` : ""}${sec("Conectar APIs", "marketplaces", `<div class="vd-grid vd-c1">${mB}</div>`)}`;
      }
      function renderAll() {
        renderApiNavigation();
        renderProducts();
        renderKits();
        renderWarehouses();
        renderHistoryFilters();
        renderHistory();
        renderRecent();
        renderCategories();
        renderCatalogs();
        renderMarketplaces();
        renderOutsourcing();
        renderDynamicProducts();
        renderSupplierOrders();
        bindSupplierOrders();
        renderExpiryControl();
        renderTasks();
        renderDashboard();
      }
      function toast(m) {
        const t = $("#toast");
        if (!t) return;
        t.textContent = m;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 2800);
      }
      // Diálogos internos: o sistema não usa mais alert/confirm/prompt do navegador.
      let pendingDialogResolve = null;
      function finishInternalDialog(value = false) {
        const resolve = pendingDialogResolve;
        pendingDialogResolve = null;
        $("#modal")?.classList.remove("open", "marketplace-fullscreen");
        if (resolve) resolve(value);
      }
      function internalConfirm(message, options = {}) {
        return new Promise((resolve) => {
          if (pendingDialogResolve) finishInternalDialog(false);
          pendingDialogResolve = resolve;
          const title = options.title || "Confirme a ação";
          const confirmLabel = options.confirmLabel || "Confirmar";
          const dangerClass = options.danger === false ? "primary" : "danger";
          openModal(`<div class="internal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="internalDialogTitle"><p class="eyebrow">CONFIRMAÇÃO</p><h2 id="internalDialogTitle">${esc(title)}</h2><p class="internal-dialog-message">${esc(message)}</p><div class="internal-dialog-actions"><button type="button" class="secondary" id="internalDialogCancel">Cancelar</button><button type="button" class="${dangerClass}" id="internalDialogConfirm">${esc(confirmLabel)}</button></div></div>`);
          $("#internalDialogCancel").onclick = () => finishInternalDialog(false);
          $("#internalDialogConfirm").onclick = () => finishInternalDialog(true);
          $("#internalDialogConfirm").focus();
        });
      }
      function internalPrompt(message, initialValue = "", options = {}) {
        return new Promise((resolve) => {
          if (pendingDialogResolve) finishInternalDialog(null);
          pendingDialogResolve = resolve;
          const title = options.title || "Editar informação";
          const label = options.label || "Novo valor";
          openModal(`<div class="internal-dialog" role="dialog" aria-modal="true" aria-labelledby="internalPromptTitle"><p class="eyebrow">EDIÇÃO</p><h2 id="internalPromptTitle">${esc(title)}</h2><p class="internal-dialog-message">${esc(message)}</p><form id="internalPromptForm" class="internal-dialog-form"><label>${esc(label)}<input id="internalPromptInput" name="value" value="${esc(initialValue)}" required></label><div class="internal-dialog-actions"><button type="button" class="secondary" id="internalPromptCancel">Cancelar</button><button type="submit" class="primary">Salvar</button></div></form></div>`);
          $("#internalPromptCancel").onclick = () => finishInternalDialog(null);
          $("#internalPromptForm").onsubmit = (event) => { event.preventDefault(); const value = $("#internalPromptInput").value.trim(); if (value) finishInternalDialog(value); };
          $("#internalPromptInput").focus();
          $("#internalPromptInput").select();
        });
      }
      function internalText(message, value, options = {}) {
        openModal(`<div class="internal-dialog" role="dialog" aria-modal="true" aria-labelledby="internalTextTitle"><p class="eyebrow">INFORMAÇÃO</p><h2 id="internalTextTitle">${esc(options.title || "Informação")}</h2><p class="internal-dialog-message">${esc(message)}</p><input class="internal-dialog-value" id="internalDialogValue" value="${esc(value)}" readonly aria-label="${esc(options.label || "Valor")}"><div class="internal-dialog-actions"><button type="button" class="secondary" id="internalTextClose">Fechar</button><button type="button" class="primary" id="internalTextCopy">Copiar</button></div></div>`);
          $("#internalTextClose").onclick = () => $("#modal").classList.remove("open");
          $("#internalTextCopy").onclick = async () => { try { await navigator.clipboard.writeText(value); toast("Copiado"); } catch (_) { $("#internalDialogValue").select(); toast("Selecione e copie o valor acima"); } };
          $("#internalDialogValue").focus();
          $("#internalDialogValue").select();
      }
      async function post(url, body = {}, method = "POST") {
        const r = await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const x = await r.json();
        if (!r.ok) throw Error(x.error || "Erro");
        return x;
      }
      function productLine(kind) {
        return `<input class="productInput" list="${kind === "exit" ? "productOrKitOptions" : "productOptions"}" placeholder="${kind === "exit" ? "Produto ou kit" : "Digite nome ou SKU"}" autocomplete="off">`;
      }
      function addLine(kind) {
        const box = $(`#${kind}Lines`);
        if (!box) return;
        const r = document.createElement("div");
        r.className = `operation-line ${kind}-line`;
        r.innerHTML =
          kind === "transfer"
            ? `${productLine(kind)}<select class="warehouseSelect"></select><select class="warehouseSelect"></select><input class="lineQty" type="number" min="0.01" step="0.01" value="1"><button type="button" class="remove-line">×</button>`
            : `${productLine(kind)}<select class="warehouseSelect"></select><input class="lineQty" type="number" min="0.01" step="0.01" value="1">${kind === "entry" ? '<input class="lineExpiry" type="date" aria-label="Data de validade" style="visibility:hidden">' : ""}<input class="lineNote" placeholder="Opcional"><button type="button" class="remove-line">×</button>`;
        box.append(r);
        const validity = r.querySelector(".validity-control");
        if (validity) validity.style.display = add11IsEnabled("expiry-control") ? "" : "none";
        fillSelects();
        bindRichProductPickers(r);
        r.querySelector(".remove-line").onclick = () => {
          if (box.children.length > 1) r.remove();
        };
      }
      function collect(kind) {
        return $$("#" + kind + "Lines .operation-line")
          .map((r) => {
            const v = r.querySelector(".productInput").value.trim(),
              p = pBy(v),
              k = kind === "exit" ? kBy(v) : null,
              ss = r.querySelectorAll(".warehouseSelect");
            return {
              product_id: p?.id,
              kit_id: k?.id,
              warehouse_id: ss[0]?.value,
              to_warehouse_id: ss[1]?.value,
              quantity: Number(r.querySelector(".lineQty").value),
              expiry_date: r.querySelector(".lineExpiry")?.value || "",
              note: r.querySelector(".lineNote")?.value || "",
            };
          })
          .filter((x) => (x.product_id || x.kit_id) && x.quantity > 0);
      }
      async function submitMove(e, kind, type) {
        e.preventDefault();
        const lines = collect(kind);
        if (!lines.length)
          return toast("Adicione pelo menos um produto válido.");
        const f = new FormData(e.target);
        try {
          await post("/api/movements", {
            type,
            warehouse_id: lines[0].warehouse_id,
            invoice: f.get("invoice") || "",
            date: f.get("date") || "",
            lines,
            note: f.get("note") || "",
          });
          toast(type === "IN" ? "Entrada registrada" : "Saída registrada");
          e.target.reset();
          $(`#${kind}Lines`).innerHTML = "";
          addLine(kind);
          load();
        } catch (x) {
          toast(x.message);
        }
      }
      function openModal(h) {
        $("#modal").classList.remove("marketplace-fullscreen");
        $("#modalContent").innerHTML = h;
        $("#modal").classList.add("open");
        $(".close").onclick = () => finishInternalDialog(false);
        fillSelects();
      }
      function productForm(p = {}) {
        const selectedCat =
          p.category_id ||
          D.categories.find((c) => c.name === p.category)?.id ||
          "";
        const subs = catChildren(selectedCat);
        return `<h2>${p.id ? "Editar" : "Novo"} produto</h2><form id="productForm" class="modal-form"><div class="checks"><label><input id="toggleType" type="checkbox" ${p.ao || p.bo ? "checked" : ""}> Incluir tipo</label><label><input id="toggleMeasures" type="checkbox" ${p.length || p.width || p.height ? "checked" : ""}> Incluir medidas</label><label class="validity-control expiry-check"><input type="checkbox" name="uses_expiry" ${p.uses_expiry ? "checked" : ""}> Produto com validade</label></div><label>Foto (URL opcional)<input name="image" value="${esc(p.image || "")}" placeholder="https://..."></label><div class="form-grid category-fields"><label>Categoria<select id="productCategory" name="category_id"><option value="">Sem categoria</option>${D.categories
          .filter((c) => !c.parent_id)
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id === selectedCat ? "selected" : ""}>${esc(c.name)}</option>`,
          )
          .join(
            "",
          )}</select></label><label>Subcategoria<select id="productSubcategory" name="subcategory_id" ${subs.length ? "" : "disabled"}><option value="">Nenhuma</option>${subs.map((c) => `<option value="${c.id}" ${c.id === p.subcategory_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div><label>SKU<input name="sku" value="${esc(p.sku || "")}" required></label><label>Nome do item<input name="name" value="${esc(p.name || "")}" required></label><div id="typeFields" class="form-grid" style="display:${p.ao || p.bo ? "grid" : "none"}"><label>Tipo<select name="kind"><option value="AO" ${p.ao ? "selected" : ""}>AO</option><option value="BO" ${p.bo ? "selected" : ""}>BO</option></select></label></div><div id="measureFields" class="form-grid" style="display:${p.length || p.width || p.height ? "grid" : "none"}"><label>Comprimento<input name="length" type="number" step="0.01" value="${p.length || ""}"></label><label>Largura<input name="width" type="number" step="0.01" value="${p.width || ""}"></label><label>Altura<input name="height" type="number" step="0.01" value="${p.height || ""}"></label></div><div class="form-grid"><label>Tipo de unidade<input name="unit" value="${esc(p.unit || "UN")}" required></label><label>Marca<input name="brand" list="brandOptions" value="${esc(p.brand || "")}" required></label><label>Fornecedor<input name="supplier" list="supplierOptions" value="${esc(p.supplier || "")}"></label><label>Estoque mínimo<input name="min" type="number" value="${p.min || 0}"></label><label>Estoque máximo<input name="max" type="number" value="${p.max || 0}"></label><label class="validity-control expiry-days ${p.uses_expiry ? "" : "expiry-days-off"}">Avise-me do vencimento com antecedência (dias)<input name="expiry_alert_days" type="number" min="0" step="1" value="${p.expiry_alert_days ?? 30}"></label></div><button class="primary">Salvar produto</button></form>`;
      }
      function productModal(p) {
        openModal(productForm(p));
        renderAdd11();
        $("#toggleType").onchange = (e) =>
          ($("#typeFields").style.display = e.target.checked ? "grid" : "none");
        $("#toggleMeasures").onchange = (e) =>
          ($("#measureFields").style.display = e.target.checked
            ? "grid"
            : "none");
        $("#productCategory").onchange = (e) => {
          const sub = $("#productSubcategory"),
            items = catChildren(e.target.value);
          sub.innerHTML =
            '<option value="">Nenhuma</option>' +
            items
              .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
              .join("");
          sub.disabled = !items.length;
        };
        $("#productForm").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target),
            o = Object.fromEntries(f);
          o.ao = ["AO", "AB"].includes(f.get("kind"));
          o.bo = ["BO", "OB"].includes(f.get("kind"));
          o.kind = o.ao ? "AB" : o.bo ? "OB" : null;
          o.onda = o.ao ? "Onda Alta" : o.bo ? "Onda Baixa" : null;
          o.uses_expiry = f.get("uses_expiry") === "on";
          if (!$("#toggleType").checked) o.ao = o.bo = false;
          if (!$("#toggleMeasures").checked) o.length = o.width = o.height = 0;
          try {
            await post(
              p.id ? "/api/products/" + p.id : "/api/products",
              o,
              p.id ? "PUT" : "POST",
            );
            $("#modal").classList.remove("open");
            toast("Produto salvo");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function kitModal(k = {}) {
        openModal(
          `<h2>${k.id ? "Editar" : "Montar"} kit</h2><form id="kitForm" class="modal-form"><label>SKU<input name="sku" value="${esc(k.sku || "")}"></label><label>Nome do kit<input name="name" value="${esc(k.name || "")}" required></label>${[0, 1, 2].map((n) => `<div class="form-grid"><label>Produto ${n + 1}<select name="p${n}" class="productSelect"></select></label><label>Quantidade<input name="q${n}" type="number" min="1" value="${k.items?.[n]?.quantity || 1}"></label></div>`).join("")}<button class="primary">Salvar kit</button></form>`,
        );
        (k.items || []).forEach((x, i) => {
          const s = $(`[name=p${i}]`);
          if (s) s.value = x.product_id;
        });
        $("#kitForm").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target),
            items = [0, 1, 2].map((n) => ({
              product_id: f.get("p" + n),
              quantity: Number(f.get("q" + n)),
            }));
          try {
            await post(
              k.id ? "/api/kits/" + k.id : "/api/kits",
              { name: f.get("name"), sku: f.get("sku"), items },
              k.id ? "PUT" : "POST",
            );
            $("#modal").classList.remove("open");
            toast("Kit salvo");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      async function deleteProduct(id) {
        if (!(await internalConfirm("Excluir este produto?", { title: "Excluir produto", confirmLabel: "Excluir" }))) return;
        try {
          await post("/api/products/" + id, {}, "DELETE");
          toast("Produto excluído");
          load();
        } catch (x) {
          toast(x.message);
        }
      }
      async function deleteKit(id) {
        if (!(await internalConfirm("Excluir este kit?", { title: "Excluir kit", confirmLabel: "Excluir" }))) return;
        try {
          await post("/api/kits/" + id, {}, "DELETE");
          toast("Kit excluído");
          load();
        } catch (x) {
          toast(x.message);
        }
      }
      async function editCategory(name) {
        const v = await internalPrompt("Informe o novo nome da categoria.", name, { title: "Renomear categoria", label: "Nome da categoria" });
        if (v && v !== name)
          try {
            await post(
              "/api/categories/" + encodeURIComponent(name),
              { name: v },
              "PUT",
            );
            load();
          } catch (e) {
            toast(e.message);
          }
      }
      async function deleteCategory(name) {
        if (await internalConfirm("Excluir esta categoria?", { title: "Excluir categoria", confirmLabel: "Excluir" }))
          try {
            await post(
              "/api/categories/" + encodeURIComponent(name),
              {},
              "DELETE",
            );
            load();
          } catch (e) {
            toast(e.message);
          }
      }
      async function editCatalog(k, n) {
        const v = await internalPrompt("Informe o novo nome.", n, { title: "Editar cadastro", label: "Nome" });
        if (v && v !== n)
          try {
            await post(
              "/api/catalogs/" + k + "/" + encodeURIComponent(n),
              { name: v },
              "PUT",
            );
            load();
          } catch (e) {
            toast(e.message);
          }
      }
      async function deleteCatalog(k, n) {
        if (await internalConfirm("Excluir este cadastro?", { title: "Excluir cadastro", confirmLabel: "Excluir" }))
          try {
            await post(
              "/api/catalogs/" + k + "/" + encodeURIComponent(n),
              {},
              "DELETE",
            );
            load();
          } catch (e) {
            toast(e.message);
          }
      }
      const ADD11_FEATURES = {
        kits: { label: "Kits", view: "kits" },
        outsourcing: { label: "Terceirização", view: "outsourcing" },
        "dynamic-products": { label: "Produtos dinâmicos", view: "dynamic-products" },
        "supplier-orders": { label: "Estoque fornecedor", view: "supplier-orders" },
        marketplaces: { label: "Conectar APIs", view: "marketplaces" },
        "expiry-control": { label: "Controle de validade", view: "expiry-control" },
      };
      const ADD11_STORAGE_KEY = "estoque_add11_features";
      let add11State = {};
      function add11UserStorageKey() { return `${ADD11_STORAGE_KEY}:${currentUser?.id || currentUser?.email || "anonymous"}`; }
      function readAdd11Local(key = add11UserStorageKey()) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; } }
      async function loadAdd11Preferences() {
        add11State = {};
        try {
          const response = await apiFetch("/api/addons/preferences");
          const data = await response.json();
          if (response.ok && data.preferences && typeof data.preferences === "object") {
            add11State = data.preferences;
          } else {
            const legacy = localStorage.getItem(ADD11_STORAGE_KEY);
            add11State = readAdd11Local();
            if (!Object.keys(add11State).length && legacy) {
              try { add11State = JSON.parse(legacy) || {}; } catch (_) { add11State = {}; }
              localStorage.removeItem(ADD11_STORAGE_KEY);
            }
            await persistAdd11Preferences();
          }
        } catch (_) { add11State = readAdd11Local(); }
        localStorage.setItem(add11UserStorageKey(), JSON.stringify(add11State));
        renderAdd11();
      }
      async function persistAdd11Preferences() {
        localStorage.setItem(add11UserStorageKey(), JSON.stringify(add11State));
        try { await apiFetch("/api/addons/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: add11State }) }); } catch (_) {}
      }
      function add11IsEnabled(key) { return add11State[key] === true; }
      function add11OpenView(button) {
        const viewName = button.dataset.view;
        const view = viewName && $("#" + viewName);
        if (!view) return;
        $$(".sidebar nav button").forEach((x) => x.classList.remove("active"));
        $$(".special-nav-items button").forEach((x) => x.classList.remove("active"));
        button.classList.add("active");
        $$(".view").forEach((v) => v.classList.remove("active"));
        view.classList.add("active");
        $(".warehouse").style.display = viewName === "dashboard" ? "flex" : "none";
        if (viewName !== "marketplaces" && $("#apiSubnav")) $("#apiSubnav").hidden = true;
      }
      function renderAdd11() {
        $$('[data-toggle-feature]').forEach((option) => {
          option.checked = add11IsEnabled(option.dataset.toggleFeature);
        });
        $$(".validity-control").forEach((field) => { field.style.display = add11IsEnabled("expiry-control") ? "" : "none"; });
        const container = $("#specialNavItems");
        if (!container) return;
        container.innerHTML = Object.entries(ADD11_FEATURES)
          .filter(([key]) => add11IsEnabled(key))
          .map(([key, feature]) => `<button type="button" class="special-nav-item" data-view="${feature.view}" data-special-feature="${key}"${key === "marketplaces" ? ' data-connection="overview"' : ""}>${feature.label}</button>`)
          .join("");
        container.querySelectorAll("button").forEach((button) => {
          button.onclick = () => {
            if (button.dataset.view === "marketplaces") {
              activeApiConnection = "overview";
              $("#apiSubnav").hidden = false;
              renderMarketplaces();
            }
            add11OpenView(button);
          };
        });
      }
      $$('[data-toggle-feature]').forEach((option) => option.addEventListener("change", (event) => {
        event.stopPropagation();
        const key = option.dataset.toggleFeature;
        add11State[key] = option.checked;
        void persistAdd11Preferences();
        if (!add11State[key] && $(".view.active")?.id === ADD11_FEATURES[key].view) {
          $("#home-dashboard")?.classList.add("active");
          $(".view.active:not(#home-dashboard)")?.classList.remove("active");
          $(".sidebar nav button.active")?.classList.remove("active");
          $("[data-view=home-dashboard]")?.classList.add("active");
        }
        renderAdd11();
        renderDashboard();
      }));
      renderAdd11();
      $$(".sidebar nav > button").forEach((b) => b.onclick = () => add11OpenView(b));
      $$('[data-view="marketplaces"]').forEach((b) => b.onclick = () => { activeApiConnection = b.dataset.connection || "overview"; $("nav").querySelectorAll("button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); $$(".view").forEach((v) => v.classList.remove("active")); $("#marketplaces").classList.add("active"); $("#apiSubnav").hidden = false; renderMarketplaces(); });
      $("#home-dashboard")?.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => {
        const target = $("#" + button.dataset.view);
        if (!target) return;
        $$(".view").forEach((view) => view.classList.remove("active"));
        target.classList.add("active");
        $$('nav button').forEach((navButton) => navButton.classList.toggle("active", navButton.dataset.view === button.dataset.view));
        $(".warehouse").style.display = button.dataset.view === "dashboard" ? "flex" : "none";
      });
      $("#dashboardPeriod")?.addEventListener("change", renderDashboard);
      $("#dashboardCompare")?.addEventListener("change", renderDashboard);
      $("#dashboardFrom")?.addEventListener("change", () => { $("#dashboardPeriod").value = "custom"; renderDashboard(); });
      $("#dashboardTo")?.addEventListener("change", () => { $("#dashboardPeriod").value = "custom"; renderDashboard(); });
      $("#dashboardCategory")?.addEventListener("change", renderDashboard);
      $("#home-dashboard")?.addEventListener("click", (ev) => {
        const chip = ev.target.closest("[data-vdf]"); if (chip) { vdFilter = chip.dataset.vdf; renderDashboard(); return; }
        const go = ev.target.closest("[data-go]"); if (go) vdGo(go.dataset.go);
      });
      $("#search").oninput = renderProducts;
      $("#statusFilter").onchange = renderProducts;
      $("#globalWarehouse").onchange = () => { renderProducts(); renderDashboard(); renderTasks(); };
      $$(".add-line").forEach(
        (b) => (b.onclick = () => addLine(b.dataset.kind)),
      );
      $("#entryForm").onsubmit = (e) => submitMove(e, "entry", "IN");
      $("#exitForm").onsubmit = (e) => submitMove(e, "exit", "OUT");
      $("#transferForm").onsubmit = async (e) => {
        e.preventDefault();
        const lines = collect("transfer");
        if (!lines.length)
          return toast("Adicione pelo menos um produto válido.");
        const f = new FormData(e.target);
        try {
          const transferResult = await post("/api/transfers", {
            from_warehouse_id: lines[0].warehouse_id,
            to_warehouse_id: lines[0].to_warehouse_id,
            lines,
            note: f.get("note") || "",
          });
          const movedLots = (transferResult.movement?.lines || []).flatMap((l) => l.expiry_moved || []);
          toast("Transferência realizada" + (movedLots.length && add11IsEnabled("expiry-control") ? " · validade: " + movedLots.map((x) => `${x.quantity} un em ${new Date(x.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}`).join(", ") : ""));
          e.target.reset();
          $("#transferLines").innerHTML = "";
          addLine("transfer");
          load();
        } catch (x) {
          toast(x.message);
        }
      };
      $("#marketplaceSync")?.addEventListener("click", () => marketplaceSync());
      $("#newCustomConnection")?.addEventListener("click", () => customConnectionModal());
      $("#newCustomConnectionNav")?.addEventListener("click", () => customConnectionModal());
      document.addEventListener("click", (event) => { const trigger = event.target.closest?.('[data-action="new-custom-connection"]'); if (trigger) { event.preventDefault(); event.stopPropagation(); customConnectionModal(); } });
      $("#newMarketplaceListing")?.addEventListener("click", marketplaceListingModal);
      $("#openMarketplaceMap")?.addEventListener("click", marketplaceOpenVisualMap);
      $("#logoutAccount")?.addEventListener("click", logoutAccount);
      $("#newProduct").onclick = () => productModal({});
      $("#newOutsourcing").onclick = newOutModal;
      $("#newKit").onclick = () => kitModal({});
      $("#newCategory").onclick = () => {
        openModal(
          `<h2>Nova categoria</h2><form id="categoryForm" class="modal-form"><label>Nome<input name="name" placeholder="Ex.: Eletrônicos" required></label><label>Tipo<select name="parent_id"><option value="">Categoria principal</option>${D.categories
            .filter((c) => !c.parent_id)
            .map(
              (c) =>
                `<option value="${c.id}">Subcategoria de ${esc(c.name)}</option>`,
            )
            .join(
              "",
            )}</select></label><button class="primary">Cadastrar categoria</button></form>`,
        );
        $("#categoryForm").onsubmit = async (e) => {
          e.preventDefault();
          try {
            await post(
              "/api/categories",
              Object.fromEntries(new FormData(e.target)),
            );
            $("#modal").classList.remove("open");
            toast("Categoria cadastrada");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      };
      $("#brandForm").onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        post("/api/catalogs/brands", Object.fromEntries(f))
          .then(() => {
            toast("Marca cadastrada");
            e.target.reset();
            load();
          })
          .catch((x) => toast(x.message));
      };
      $("#supplierForm").onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        post("/api/catalogs/suppliers", Object.fromEntries(f))
          .then(() => {
            toast("Fornecedor cadastrado");
            e.target.reset();
            load();
          })
          .catch((x) => toast(x.message));
      };
      $("#newWarehouse").onclick = () => {
        openModal(
          `<h2>Novo estoque</h2><form id="warehouseForm" class="modal-form"><label>Nome<input name="name" required></label><label>Descrição<input name="description"></label><button class="primary">Cadastrar estoque</button></form>`,
        );
        $("#warehouseForm").onsubmit = async (e) => {
          e.preventDefault();
          try {
            await post(
              "/api/warehouses",
              Object.fromEntries(new FormData(e.target)),
            );
            $("#modal").classList.remove("open");
            toast("Estoque cadastrado");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      };
      $("#modal").onclick = (e) => {
        if (e.target.id === "modal") finishInternalDialog(false);
      };
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && $("#modal")?.classList.contains("open")) finishInternalDialog(false);
      });
      // A sincronização automática no navegador foi removida: cada aba gerava chamadas duplicadas.
      // Use o botão manual ou um Cron Trigger no Worker para sincronizar marketplaces.
      if ($("#exportData"))
        $("#exportData").onclick = () => {
          window.location.href = "/api/export";
        };
      if ($("#importForm"))
        $("#importForm").onsubmit = async (e) => {
          e.preventDefault();
          const file = $("#importFile").files[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            const r = await post("/api/import", data);
            toast(
              `Importação concluída: ${data.products?.length || 0} produtos`,
            );
            load();
          } catch (x) {
            toast(x.message || "JSON inválido");
          }
        };

      if ($("#resetData"))
        $("#resetData").onclick = async () => {
          if (
            !(await internalConfirm(
              "ATENÇÃO: isso apagará produtos, estoque, kits, movimentações, categorias, marcas, fornecedores e terceirizações. Deseja continuar?",
              { title: "Apagar todos os dados", confirmLabel: "Apagar tudo" },
            ))
          )
            return;
          try {
            await post("/api/reset");
            toast("Todos os dados foram apagados");
            load();
          } catch (x) {
            toast(x.message);
          }
        };

      /* Tela dedicada do produto: sem modal e sem botão adicional na lista. */
      let selectedProductId = null;
      function detailProduct() {
        return D.products.find((p) => p.id === selectedProductId);
      }
      function detailMovementLines(m, pid) {
        return (m.lines || []).filter((x) => x.product_id === pid);
      }
      function detailProductMovements(pid) {
        return (D.movements || []).filter((m) =>
          m.type === "INVENTORY_ADJUSTMENT"
            ? m.product_id === pid
            : detailMovementLines(m, pid).length,
        );
      }
      function detailMovementType(m) {
        return m.type === "INVENTORY_ADJUSTMENT"
          ? "AJUSTE DE INVENTÁRIO"
          : {
              IN: "ENTRADA",
              OUT: "SAÍDA",
              TRANSFER: "TRANSFERÊNCIA",
              KIT_OUT: "SAÍDA DE KIT",
              OUTSOURCING: "TERCEIRIZAÇÃO",
            }[m.type] || m.type;
      }
      function detailMovementQuantity(m, pid) {
        if (m.type === "INVENTORY_ADJUSTMENT") return Number(m.difference || 0);
        return detailMovementLines(m, pid).reduce(
          (n, x) =>
            n +
            Number(x.quantity || 0) *
              (m.type === "OUT" || m.type === "KIT_OUT" ? -1 : 1),
          0,
        );
      }
      function detailStockOptions(selected) {
        return (D.warehouses || [])
          .map(
            (w) =>
              `<option value="${esc(w.id)}" ${w.id === selected ? "selected" : ""}>${esc(w.name)}</option>`,
          )
          .join("");
      }
      function detailFormSelects() {
        const p = detailProduct();
        if (!p) return;
        const selected = $("#globalWarehouse")?.value;
        const first =
          selected && selected !== "all" ? selected : D.warehouses[0]?.id;
        $("#productEntryForm select[name=warehouse_id]").innerHTML =
          detailStockOptions(first);
        $("#productExitForm select[name=warehouse_id]").innerHTML =
          detailStockOptions(first);
        $("#productAdjustmentForm select[name=warehouse_id]").innerHTML =
          detailStockOptions(first);
        $("#productTransferForm select[name=from_warehouse_id]").innerHTML =
          detailStockOptions(first);
        $("#productTransferForm select[name=to_warehouse_id]").innerHTML =
          detailStockOptions(
            D.warehouses.find((w) => w.id !== first)?.id || first,
          );
      }
      function showProductDetail(pid) {
        selectedProductId = pid;
        $("#dashboard").classList.remove("active");
        $("#productDetail").classList.add("active");
        $("#productDetail").scrollIntoView({
          behavior: "instant",
          block: "start",
        });
        $$("nav button").forEach((b) =>
          b.classList.toggle("active", b.dataset.view === "dashboard"),
        );
        renderCommonProductDetail();
      }
      function hideProductDetail() {
        selectedProductId = null;
        $("#productDetail").classList.remove("active");
        $("#dashboard").classList.add("active");
        $$("nav button").forEach((b) =>
          b.classList.toggle("active", b.dataset.view === "dashboard"),
        );
      }
      function renderIncremental(
        target,
        items,
        renderer,
        emptyHTML,
        batch = 30,
        scrollTarget = target,
        afterAppend = () => {},
      ) {
        if (!target) return;
        target.innerHTML = "";
        let index = 0,
          loading = false;
        const append = () => {
          if (loading || index >= items.length) return;
          loading = true;
          target.insertAdjacentHTML(
            "beforeend",
            items
              .slice(index, index + batch)
              .map(renderer)
              .join(""),
          );
          index = Math.min(index + batch, items.length);
          loading = false;
          afterAppend();
          if (index >= items.length) scrollTarget.onscroll = null;
        };
        if (!items.length) {
          target.innerHTML = emptyHTML;
          scrollTarget.onscroll = null;
          return;
        }
        scrollTarget.onscroll = () => {
          if (
            scrollTarget.scrollTop + scrollTarget.clientHeight >=
            scrollTarget.scrollHeight - 120
          )
            append();
        };
        append();
      }
      async function deleteStoredMovement(movementId) {
        if (!movementId) return;
        const confirmed = await internalConfirm(
          "Excluir esta movimentação? O efeito dela também será desfeito no estoque.",
          { title: "Excluir movimentação", confirmLabel: "Excluir" },
        );
        if (!confirmed) return;
        try {
          await post("/api/movements/" + encodeURIComponent(movementId), {}, "DELETE");
          document.querySelectorAll(".movement-delete").forEach((button) => {
            if (button.dataset.movementId === movementId) button.closest("tr")?.remove();
          });
          toast("Movimentação excluída e estoque atualizado");
          await load();
          if (selectedProductId) renderProductDetail();
        } catch (error) {
          toast(error.message);
        }
      }
      function movementActionMarkup(movement) {
        return `<button type="button" class="history-delete movement-delete" data-movement-id="${esc(movement.id || "")}" title="Excluir movimentação" aria-label="Excluir movimentação">🗑</button>`;
      }
      function bindMovementDeleteButtons(container) {
        container?.querySelectorAll(".movement-delete").forEach((button) => {
          if (button.dataset.bound) return;
          button.dataset.bound = "1";
          button.onclick = () => deleteStoredMovement(button.dataset.movementId);
        });
      }

      function renderCommonProductDetail() {
        const p = detailProduct();
        if (!p || !$("#productDetail")) return;
        $("#productDetailTitle").textContent = p.name;
        $("#productDetailMeta").textContent =
          `SKU ${p.sku || "—"} · ${p.brand || "Sem marca"} · ${categoryLabel(p)} · ${p.supplier || "Fornecedor não informado"}`;
        const summary = $("#productDetailSummary");
        summary.innerHTML =
          (D.warehouses || [])
            .map(
              (w) =>
                `<span class="tag"><strong>${esc(w.name)}:</strong> ${qty(p.id, w.id)} ${esc(p.unit || "UN")}</span>`,
            )
            .join("") +
          `<span class="tag">Mínimo: ${Number(p.min || 0)}</span><span class="tag">Máximo: ${Number(p.max || 0)}</span>`;
        const history = detailProductMovements(p.id);
        const historyBox = $("#productDetailHistory");
        renderIncremental(
          historyBox,
          history,
          (m) => {
            const q = detailMovementQuantity(m, p.id),
              source =
                m.type === "INVENTORY_ADJUSTMENT"
                  ? `Anterior: ${m.previous_quantity} → novo: ${m.new_quantity}`
                  : m.invoice
                    ? `Nota: ${esc(m.invoice)}`
                    : m.sale_source
                      ? `Venda: ${esc(m.sale_source)}`
                      : "—";
            return `<tr><td>${new Date(m.date).toLocaleString("pt-BR")}</td><td class="type-${m.type}">${detailMovementType(m)}</td><td>${q > 0 ? "+" : ""}${q} ${esc(p.unit || "UN")}</td><td>${esc(wName(m.warehouse_id) || "—")}</td><td>${source}</td><td>${esc(m.reason || m.note || "—")}</td><td class="history-actions">${movementActionMarkup(m)}</td></tr>`;
          },
          `<tr><td colspan="7" class="history-no-results">Nenhuma movimentação registrada para este produto.</td></tr>`,
          30,
          historyBox.closest(".table-wrap"),
          () => bindMovementDeleteButtons(historyBox),
        );
        const kits = (D.kits || []).filter((k) =>
          (k.items || []).some((i) => i.product_id === p.id),
        );
        renderIncremental(
          $("#productDetailKits"),
          kits,
          (k) => {
            const item = k.items.find((i) => i.product_id === p.id);
            return `<span class="tag">${esc(k.name)} · ${item.quantity} ${esc(p.unit || "UN")}</span>`;
          },
          `<span class="product-meta">Este produto ainda não está inserido em nenhum kit.</span>`,
          20,
          $("#productDetailKits"),
        );
        detailFormSelects();
      }
      function renderProducts() {
        const q = ($("#search")?.value || "").toLowerCase(),
          f = $("#statusFilter")?.value || "",
          ps = D.products
            .filter((p) =>
              `${p.name} ${p.sku} ${p.brand || ""} ${p.supplier || ""} ${p.category || ""} ${p.subcategory || ""}`
                .toLowerCase()
                .includes(q),
            )
            .filter((p) => !f || state(p).state === f),
          grid = $("#productGrid");
        if (!grid) return;
        const card = (p) => {
          const x = state(p),
            initials = esc((p.name || "?").slice(0, 2).toUpperCase());
          return `<article class="product-row"><div class="product-thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span>${initials}</span>`}</div><div class="product-main"><div class="product-title product-open" data-id="${esc(p.id)}" tabindex="0" role="link">${esc(p.name)}${p.length || p.width || p.height ? ` — ${p.length || 0} × ${p.width || 0} × ${p.height || 0}` : ""} — ${esc(p.brand || p.supplier || "Sem marca")} ${p.ao ? "— Onda Alta" : ""}${p.bo ? " — Onda Baixa" : ""}</div><div class="product-meta">SKU ${esc(p.sku)} · Unidade ${esc(p.unit)} · ${esc(categoryLabel(p))} · ${esc(p.supplier || "Fornecedor não informado")}</div></div><div class="row-stock"><span class="status ${x.state}">${x.label}</span><strong>${x.total} ${esc(p.unit)}</strong><small>mín. ${p.min} · máx. ${p.max}</small></div><div class="row-actions"><button class="editProduct" data-id="${esc(p.id)}">Editar</button><button class="deleteProduct" data-id="${esc(p.id)}">Excluir</button></div></article>`;
        };
        const bind = () => {
          $$(".product-open").forEach((b) => {
            if (b.dataset.bound) return;
            b.dataset.bound = "1";
            b.onclick = () => showProductDetail(b.dataset.id);
            b.onkeydown = (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                showProductDetail(b.dataset.id);
              }
            };
          });
          $$(".editProduct").forEach((b) => {
            if (b.dataset.bound) return;
            b.dataset.bound = "1";
            b.onclick = () => productModal(pBy(b.dataset.id));
          });
          $$(".deleteProduct").forEach((b) => {
            if (b.dataset.bound) return;
            b.dataset.bound = "1";
            b.onclick = () => deleteProduct(b.dataset.id);
          });
        };
        renderIncremental(
          grid,
          ps,
          card,
          `<div class="empty">Nenhum produto encontrado.</div>`,
          40,
          grid,
          bind,
        );
      }
      async function submitProductOperation(form, type) {
        const p = detailProduct();
        if (!p) return;
        const f = new FormData(form);
        const line = {
          product_id: p.id,
          warehouse_id: f.get("warehouse_id"),
          quantity: Number(f.get("quantity")),
          note: f.get("note") || "",
        };
        try {
          await post("/api/movements", {
            type,
            warehouse_id: line.warehouse_id,
            invoice: f.get("invoice") || "",
            date: f.get("date") || "",
            sale_source: f.get("sale_source") || "",
            lines: [line],
            note: f.get("note") || "",
          });
          toast(type === "IN" ? "Entrada registrada" : "Saída registrada");
          form.reset();
          renderProductDetail();
          load();
        } catch (e) {
          toast(e.message);
        }
      }
      async function submitProductTransfer(form) {
        const p = detailProduct();
        const f = new FormData(form);
        try {
          await post("/api/transfers", {
            from_warehouse_id: f.get("from_warehouse_id"),
            to_warehouse_id: f.get("to_warehouse_id"),
            lines: [
              {
                product_id: p.id,
                warehouse_id: f.get("from_warehouse_id"),
                to_warehouse_id: f.get("to_warehouse_id"),
                quantity: Number(f.get("quantity")),
              },
            ],
            note: f.get("note") || "",
          });
          toast("Transferência realizada");
          form.reset();
          renderProductDetail();
          load();
        } catch (e) {
          toast(e.message);
        }
      }
      async function submitProductAdjustment(form) {
        const p = detailProduct();
        const f = new FormData(form);
        try {
          await post("/api/stock-adjustments", {
            product_id: p.id,
            warehouse_id: f.get("warehouse_id"),
            new_quantity: Number(f.get("new_quantity")),
            reason: f.get("reason"),
            note: f.get("note") || "",
          });
          toast("Ajuste de inventário registrado");
          form.reset();
          renderProductDetail();
          load();
        } catch (e) {
          toast(e.message);
        }
      }
      $("#backToProducts").onclick = hideProductDetail;
      $("#productEntryForm").onsubmit = (e) => {
        e.preventDefault();
        submitProductOperation(e.target, "IN");
      };
      $("#productExitForm").onsubmit = (e) => {
        e.preventDefault();
        submitProductOperation(e.target, "OUT");
      };
      $("#productTransferForm").onsubmit = (e) => {
        e.preventDefault();
        submitProductTransfer(e.target);
      };
      $("#productAdjustmentForm").onsubmit = (e) => {
        e.preventDefault();
        submitProductAdjustment(e.target);
      };

      /* Operações recolhidas: apenas uma fica aberta por vez. */
      function setActiveProductOperation(name) {
        $$(".product-actions-panel .operation-toggle").forEach((button) =>
          button.classList.toggle("active", button.dataset.operation === name),
        );
        $$(".product-actions-panel .product-operation-panel").forEach((panel) =>
          panel.classList.toggle("open", panel.dataset.operationPanel === name),
        );
      }
      function bindProductOperationButtons() {
        $$(".product-actions-panel .operation-toggle").forEach((button) => {
          button.onclick = () =>
            setActiveProductOperation(
              button.classList.contains("active")
                ? ""
                : button.dataset.operation,
            );
        });
      }
      function positiveFormNumber(form, field, label, allowZero = false) {
        const raw = String(new FormData(form).get(field) ?? "").trim();
        const value = Number(raw);
        const valid =
          raw !== "" &&
          Number.isFinite(value) &&
          (allowZero ? value >= 0 : value > 0);
        if (!valid) {
          toast(
            `${label} deve ser preenchida com um número ${allowZero ? "maior ou igual a zero" : "maior que zero"}.`,
          );
          return null;
        }
        return value;
      }
      async function submitProductOperation(form, type) {
        const p = detailProduct();
        if (!p) return;
        const quantity = positiveFormNumber(form, "quantity", "A quantidade");
        if (quantity === null) return;
        const f = new FormData(form),
          warehouse = String(f.get("warehouse_id") || "").trim();
        if (!warehouse) return toast("Selecione o estoque.");
        const line = {
          product_id: p.id,
          warehouse_id: warehouse,
          quantity,
          expiry_date: f.get("expiry_date") || "",
          note: f.get("note") || "",
        };
        try {
          await post("/api/movements", {
            type,
            warehouse_id: warehouse,
            invoice: f.get("invoice") || "",
            date: f.get("date") || "",
            sale_source: f.get("sale_source") || "",
            lines: [line],
            note: f.get("note") || "",
          });
          toast(type === "IN" ? "Entrada registrada" : "Saída registrada");
          form.reset();
          setActiveProductOperation("");
          await load();
          renderProductDetail();
        } catch (e) {
          toast(e.message);
        }
      }
      async function submitProductTransfer(form) {
        const p = detailProduct();
        if (!p) return;
        const quantity = positiveFormNumber(form, "quantity", "A quantidade");
        if (quantity === null) return;
        const f = new FormData(form),
          from = String(f.get("from_warehouse_id") || "").trim(),
          to = String(f.get("to_warehouse_id") || "").trim();
        if (!from || !to)
          return toast("Selecione os estoques de origem e destino.");
        if (from === to)
          return toast("O estoque de origem e o destino devem ser diferentes.");
        try {
          await post("/api/transfers", {
            from_warehouse_id: from,
            to_warehouse_id: to,
            lines: [
              {
                product_id: p.id,
                warehouse_id: from,
                to_warehouse_id: to,
                quantity,
              },
            ],
            note: f.get("note") || "",
          });
          toast("Transferência realizada");
          form.reset();
          setActiveProductOperation("");
          await load();
          renderProductDetail();
        } catch (e) {
          toast(e.message);
        }
      }
      async function submitProductAdjustment(form) {
        const p = detailProduct();
        if (!p) return;
        const newQuantity = positiveFormNumber(
          form,
          "new_quantity",
          "A nova contagem física",
          true,
        );
        if (newQuantity === null) return;
        const f = new FormData(form),
          warehouse = String(f.get("warehouse_id") || "").trim();
        if (!warehouse) return toast("Selecione o estoque.");
        try {
          await post("/api/stock-adjustments", {
            product_id: p.id,
            warehouse_id: warehouse,
            new_quantity: newQuantity,
            reason: f.get("reason"),
            note: f.get("note") || "",
          });
          toast("Ajuste de inventário registrado");
          form.reset();
          setActiveProductOperation("");
          await load();
          renderProductDetail();
        } catch (e) {
          toast(e.message);
        }
      }
      bindProductOperationButtons();

      /* Ferramentas da barra superior. */
      function toggleTool(id, buttonId) {
        const tool = $("#" + id),
          button = $("#" + buttonId);
        if (!tool) return;
        const isOpen = tool.classList.contains("open");
        $$(".toolbar-tool").forEach((x) => x.classList.remove("open"));
        $$(".tool-button").forEach((x) => x.classList.remove("active"));
        if (!isOpen) {
          tool.classList.add("open");
          button?.classList.add("active");
        }
      }
      $("#calculatorToggle").onclick = () =>
        toggleTool("calculatorTool", "calculatorToggle");
      $("#weightCalculatorToggle").onclick = () =>
        toggleTool("weightCalculatorTool", "weightCalculatorToggle");
      $$("[data-calc]").forEach(
        (button) =>
          (button.onclick = () => {
            const display = $("#calcDisplay"),
              value = button.dataset.calc;
            if (value === "C") display.value = "";
            else if (value === "back")
              display.value = display.value.slice(0, -1);
            else if (value === "=") {
              const expression = display.value
                .replace(/×/g, "*")
                .replace(/÷/g, "/");
              if (!/^[0-9+\-*/().\s]+$/.test(expression))
                return toast("Expressão inválida.");
              try {
                const result = Function(
                  `"use strict"; return (${expression || 0})`,
                )();
                display.value = Number.isFinite(result)
                  ? String(result)
                  : "Erro";
              } catch {
                display.value = "Erro";
              }
            } else display.value += value;
          }),
      );
      function updateWeightResult() {
        const parseWeightNumber = (value) =>
          Number(
            String(value ?? "")
              .trim()
              .replace(",", "."),
          );
        const quantity = parseWeightNumber($("#weightSampleQuantity")?.value),
          sample = parseWeightNumber($("#weightSampleWeight")?.value),
          total = parseWeightNumber($("#weightTotal")?.value),
          result = $("#weightResult");
        if (!result) return;
        if (!(quantity > 0) || !(sample > 0) || !(total >= 0)) {
          result.innerHTML = "—<small>Quantidade estimada</small>";
          return;
        }
        const estimated = (quantity * total) / sample;
        const fraction = estimated - Math.floor(estimated);
        const pieces =
          fraction >= 0.8 ? Math.ceil(estimated) : Math.floor(estimated);
        result.innerHTML = `${pieces}<small>Quantidade estimada de peças</small>`;
      }
      $$("#weightCalculatorTool input").forEach(
        (input) => (input.oninput = updateWeightResult),
      );
      document.addEventListener("click", (event) => {
        if (
          !event.target.closest(".topbar-tools") &&
          !event.target.closest(".toolbar-tool")
        ) {
          $$(".toolbar-tool").forEach((x) => x.classList.remove("open"));
          $$(".tool-button").forEach((x) => x.classList.remove("active"));
        }
      });

      /* Teclado das calculadoras. */
      function calculatorPress(value) {
        const display = $("#calcDisplay");
        if (!display) return;
        if (value === "C") display.value = "";
        else if (value === "back") display.value = display.value.slice(0, -1);
        else if (value === "=") {
          const expression = display.value
            .replace(/×/g, "*")
            .replace(/÷/g, "/");
          if (!/^[0-9+\-*/().\s]+$/.test(expression))
            return toast("Expressão inválida.");
          try {
            const result = Function(
              `"use strict"; return (${expression || 0})`,
            )();
            display.value = Number.isFinite(result) ? String(result) : "Erro";
          } catch {
            display.value = "Erro";
          }
        } else display.value += value;
      }
      function toggleTool(id, buttonId) {
        const tool = $("#" + id),
          button = $("#" + buttonId);
        if (!tool) return;
        const isOpen = tool.classList.contains("open");
        $$(".toolbar-tool").forEach((x) => x.classList.remove("open"));
        $$(".tool-button").forEach((x) => x.classList.remove("active"));
        if (!isOpen) {
          tool.classList.add("open");
          button?.classList.add("active");
          requestAnimationFrame(() =>
            (id === "calculatorTool"
              ? $("#calcDisplay")
              : $("#weightSampleQuantity")
            )?.focus(),
          );
        }
      }
      $$("[data-calc]").forEach(
        (button) =>
          (button.onclick = () => calculatorPress(button.dataset.calc)),
      );
      $("#calcDisplay").onkeydown = (event) => {
        const keyMap = {
          Enter: "=",
          Escape: "C",
          Backspace: "back",
          "+": "+",
          "-": "-",
          "*": "*",
          "/": "/",
          ".": ".",
        };
        if (/^[0-9]$/.test(event.key) || keyMap[event.key]) {
          event.preventDefault();
          calculatorPress(
            /^[0-9]$/.test(event.key) ? event.key : keyMap[event.key],
          );
        }
      };
      document.addEventListener("keydown", (event) => {
        const weight = $("#weightCalculatorTool"),
          active = document.activeElement;
        if (
          weight?.classList.contains("open") &&
          active?.matches(
            "#weightSampleQuantity,#weightSampleWeight,#weightTotal",
          ) &&
          event.key === "Enter"
        ) {
          event.preventDefault();
          const fields = [
              $("#weightSampleQuantity"),
              $("#weightSampleWeight"),
              $("#weightTotal"),
            ],
            index = fields.indexOf(active),
            next = fields[index + 1];
          updateWeightResult();
          if (next) next.focus();
          else active.blur();
        }
        if (event.key === "Escape" && $$(".toolbar-tool.open").length) {
          $$(".toolbar-tool").forEach((x) => x.classList.remove("open"));
          $$(".tool-button").forEach((x) => x.classList.remove("active"));
        }
      });

      /* Módulo adicional: produtos dinâmicos, sem alterar os módulos existentes. */
      let selectedDynamicId = null;
      let dynamicDraft = null;
      let dynamicMode = "tree";
      const dynamicEsc = (value) => esc(value);
      function dynamicProductById(productId) {
        return (D.dynamicProducts || []).find(
          (product) => product.id === productId,
        );
      }
      function dynId(prefix = "DYN") {
        return prefix + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      }
      function dynamicNewNode(value = {}) {
        return {
          id: value.id || dynId("NODE"),
          name: value.name || "Novo componente",
          type: value.type || "component",
          unit: value.unit || "UN",
          stock_group_id: value.stock_group_id || "",
          quantity_per_parent: Number(value.quantity_per_parent ?? 1),
          parent_id: value.parent_id || null,
          x: Number(value.x ?? 300),
          y: Number(value.y ?? 220),
        };
      }
      function dynamicNewDraft(product) {
        const nodes = (product?.nodes || []).map((node, index) =>
          dynamicNewNode({
            ...node,
            x: node.x ?? 150 + (index % 4) * 220,
            y: node.y ?? 120 + Math.floor(index / 4) * 130,
          }),
        );
        return {
          id: product?.id || "",
          name: product?.name || "",
          unit: product?.unit || "UN",
          nodes,
          links: (product?.links || []).map((link) => ({
            ...link,
            quantity: Number(link.quantity ?? link.label ?? 1),
          })),
          stock_base_node_id: product?.stock_base_node_id || "",
          structure_locked: product?.structure_locked !== false,
        };
      }
      function dynamicNodeById(nodeId) {
        return dynamicDraft?.nodes.find((node) => node.id === nodeId);
      }
      function closeDynamicModal(host = null) {
        // Quando o modal de desconexão fica sobre o canvas, fechar o primeiro
        // backdrop removia o canvas e deixava o modal interno aberto.
        (host || document.querySelector(".dynamic-modal-backdrop"))?.remove();
      }
      function dynamicInitialModal() {
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Novo produto dinâmico</h2><p class="dynamic-muted">Informe os dados iniciais. Ao salvar, a composição ficará protegida. Depois você poderá alterar nome, quantidades e metadados; para mudar o Canvas, use Clonar produto.</p><label>Nome do produto dinâmico<input id="dynInitialProduct" placeholder="Ex.: Dumper" autofocus required></label><label>Nome do componente inicial<input id="dynInitialComponent" value="Chapa" placeholder="Ex.: Chapa" required></label><label>Tipo de unidade<input id="dynInitialUnit" value="UN" placeholder="UN" required></label><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynInitialCancel">Cancelar</button><button type="button" class="primary" id="dynInitialSave">Salvar e abrir editor</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynInitialCancel").onclick = closeDynamicModal;
        host.querySelector("#dynInitialSave").onclick = async () => {
          const name = host.querySelector("#dynInitialProduct").value.trim(),
            component = host.querySelector("#dynInitialComponent").value.trim(),
            unit = host.querySelector("#dynInitialUnit").value.trim() || "UN";
          if (!name || !component)
            return toast("Informe o nome do produto e do componente inicial.");
          const node = dynamicNewNode({
            name: component,
            unit,
            x: 360,
            y: 230,
          });
          try {
            const saved = await post("/api/dynamic-products", {
              name,
              unit,
              nodes: [node],
              links: [],
            });
            D.dynamicProducts = [saved, ...D.dynamicProducts];
            selectedDynamicId = saved.id;
            dynamicDraft = dynamicNewDraft(saved);
            closeDynamicModal();
            renderDynamicProducts();
            renderDynamicTree();
          } catch (error) {
            toast(error.message);
          }
        };
        host.querySelector("#dynInitialProduct").focus();
      }
      function dynamicNodeModal(node) {
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Editar componente</h2><label>Nome do componente<input id="dynNodeName" value="${dynamicEsc(node.name)}" autofocus required></label><label>Tipo de unidade<input id="dynNodeUnit" value="${dynamicEsc(node.unit || "UN")}" required></label><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynNodeCancel">Cancelar</button><button type="button" class="primary" id="dynNodeSave">Salvar</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynNodeCancel").onclick = closeDynamicModal;
        host.querySelector("#dynNodeSave").onclick = () => {
          const name = host.querySelector("#dynNodeName").value.trim();
          if (!name) return toast("Informe o nome do componente.");
          node.name = name;
          node.unit = host.querySelector("#dynNodeUnit").value.trim() || "UN";
          closeDynamicModal();
          dynamicMode === "tree"
            ? dynamicPersistTree().then(renderDynamicTree)
            : renderDynamicEditor();
        };
        host.querySelector("#dynNodeName").focus();
      }
      function dynamicEdgeModal(edge) {
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Quantidade da conexão</h2><p class="dynamic-muted">Altere somente a quantidade desta conexão.</p><label>Quantidade<input id="dynEdgeQty" type="number" min="0.01" step="0.01" value="${Number(edge.quantity || 1)}" autofocus required></label><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynEdgeCancel">Cancelar</button><button type="button" class="danger" id="dynEdgeDisconnect">Desconectar</button><button type="button" class="primary" id="dynEdgeSave">Salvar quantidade</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynEdgeCancel").onclick = () => closeDynamicModal(host);
        host.querySelector("#dynEdgeDisconnect").onclick = async () => {
          dynamicDraft.links = dynamicDraft.links.filter((candidate) => candidate !== edge);
          closeDynamicModal(host);
          if (dynamicMode === "tree") {
            await dynamicPersistTree();
            renderDynamicTree();
          } else renderDynamicEditor();
        };
        host.querySelector("#dynEdgeSave").onclick = async () => {
          const quantity = Number(host.querySelector("#dynEdgeQty").value);
          if (!(quantity > 0))
            return toast("Informe uma quantidade maior que zero.");
          edge.quantity = quantity;
          const target = dynamicNodeById(edge.to);
          if (target) target.quantity_per_parent = quantity;
          closeDynamicModal(host);
          if (dynamicMode === "tree") {
            await dynamicPersistTree();
            renderDynamicTree();
          } else renderDynamicEditor();
        };
        host.querySelector("#dynEdgeQty").focus();
      }
      function dynamicCanvasPoint(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.max(
            0,
            Math.min(canvas.scrollWidth, event.clientX - rect.left),
          ),
          y: Math.max(
            0,
            Math.min(canvas.scrollHeight, event.clientY - rect.top),
          ),
        };
      }
      function dynamicConnect(sourceId, targetId) {
        if (sourceId === targetId) return;
        let edge = dynamicDraft.links.find(
          (link) => link.from === sourceId && link.to === targetId,
        );
        if (!edge) {
          edge = { from: sourceId, to: targetId, quantity: 1 };
          dynamicDraft.links.push(edge);
        }
        const target = dynamicNodeById(targetId);
        if (target) {
          target.parent_id = sourceId;
          target.quantity_per_parent = edge.quantity;
        }
        dynamicEdgeModal(edge);
      }
      async function dynamicRemoveNode(nodeId) {
        const removed = dynamicNodeById(nodeId);
        if (!removed) return;
        dynamicDraft.nodes = dynamicDraft.nodes.filter(
          (node) => node.id !== nodeId,
        );
        dynamicDraft.links = dynamicDraft.links.filter(
          (link) => link.from !== nodeId && link.to !== nodeId,
        );
        dynamicDraft.nodes.forEach((node) => {
          if (node.parent_id === nodeId) {
            node.parent_id = null;
            node.quantity_per_parent = 1;
          }
        });
        toast("Componente excluído do editor.");
        if (dynamicMode === "tree") {
          await dynamicPersistTree();
          renderDynamicTree();
        } else renderDynamicEditor();
      }
      function dynamicRenderEdges() {
        const canvas = $("#dynamicCanvas");
        if (!canvas) return;
        canvas
          .querySelectorAll(".dynamic-edge-line,.dynamic-edge-label")
          .forEach((element) => element.remove());
        for (const edge of dynamicDraft.links) {
          const source = dynamicNodeById(edge.from),
            target = dynamicNodeById(edge.to);
          if (!source || !target) continue;
          const x1 = source.x + 190,
            y1 = source.y + 39,
            x2 = target.x,
            y2 = target.y + 39;
          const line = document.createElement("div");
          line.className = "dynamic-edge-line";
          line.style.width = Math.hypot(x2 - x1, y2 - y1) + "px";
          line.style.transform = `translate(${x1}px,${y1}px) rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
          canvas.append(line);
          const label = document.createElement("button");
          label.type = "button";
          label.className = "dynamic-edge-label";
          label.textContent = Number(edge.quantity || 1);
          label.style.left = (x1 + x2) / 2 + "px";
          label.style.top = (y1 + y2) / 2 + "px";
          label.onclick = (event) => {
            event.stopPropagation();
            dynamicEdgeModal(edge);
          };
          canvas.append(label);
        }
      }
      function dynamicBindCanvas() {
        const canvas = $("#dynamicCanvas");
        if (!canvas) return;
        let drag = null,
          connect = null;
        canvas.querySelectorAll(".dynamic-canvas-node").forEach((element) => {
          const node = dynamicNodeById(element.dataset.id);
          element.addEventListener("pointerdown", (event) => {
            if (event.target.closest(".dynamic-connect,.dynamic-node-action"))
              return;
            drag = {
              node,
              start: dynamicCanvasPoint(event, canvas),
              x: node.x,
              y: node.y,
            };
          });
          element.addEventListener("pointermove", (event) => {
            if (!drag) return;
            const point = dynamicCanvasPoint(event, canvas);
            drag.node.x = Math.max(0, drag.x + point.x - drag.start.x);
            drag.node.y = Math.max(0, drag.y + point.y - drag.start.y);
            element.style.left = drag.node.x + "px";
            element.style.top = drag.node.y + "px";
            dynamicRenderEdges();
          });
          element.addEventListener("pointerup", () => {
            drag = null;
          });
          element.addEventListener("pointercancel", () => {
            drag = null;
          });
          element.addEventListener("dblclick", (event) => {
            if (event.target.closest(".dynamic-connect,.dynamic-node-action"))
              return;
            event.stopPropagation();
            dynamicNodeModal(node);
          });
        });
        canvas.onpointermove = (event) => {
          if (!connect) return;
          const point = dynamicCanvasPoint(event, canvas);
          connect.line.style.width =
            Math.hypot(point.x - connect.x, point.y - connect.y) + "px";
          connect.line.style.transform = `translate(${connect.x}px,${connect.y}px) rotate(${Math.atan2(point.y - connect.y, point.x - connect.x)}rad)`;
        };
        canvas.onpointerup = (event) => {
          if (!connect) return;
          const targetId = event.target.closest(".dynamic-canvas-node")?.dataset
            .id;
          if (targetId) dynamicConnect(connect.source, targetId);
          connect.line.remove();
          connect = null;
        };
        canvas.querySelectorAll(".dynamic-connect").forEach((button) => {
          button.onpointerdown = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const node = dynamicNodeById(button.dataset.id);
            connect = {
              source: node.id,
              x: node.x + 190,
              y: node.y + 39,
              line: document.createElement("div"),
            };
            connect.line.className = "dynamic-edge-line dynamic-edge-preview";
            canvas.append(connect.line);
          };
        });
        canvas.querySelectorAll(".dynamic-node-edit").forEach(
          (button) =>
            (button.onclick = (event) => {
              event.stopPropagation();
              dynamicNodeModal(dynamicNodeById(button.dataset.id));
            }),
        );
        canvas.querySelectorAll(".dynamic-node-delete").forEach(
          (button) =>
            (button.onclick = (event) => {
              event.stopPropagation();
              dynamicRemoveNode(button.dataset.id);
            }),
        );
      }
      function renderDynamicCanvas() {
        const canvas = $("#dynamicCanvas");
        if (!canvas || !dynamicDraft) return;
        canvas.innerHTML = "";
        dynamicDraft.nodes.forEach((node) => {
          const card = document.createElement("div");
          card.className = "dynamic-canvas-node component";
          card.dataset.id = node.id;
          card.style.left = node.x + "px";
          card.style.top = node.y + "px";
          card.innerHTML = `<div class="dynamic-node-actions"><button type="button" class="dynamic-node-action dynamic-node-edit" data-id="${dynamicEsc(node.id)}" title="Editar componente">✎</button><button type="button" class="dynamic-node-action dynamic-node-delete" data-id="${dynamicEsc(node.id)}" title="Excluir componente">×</button></div><strong>${dynamicEsc(node.name)}</strong><small>${dynamicEsc(node.unit || "UN")}</small><button type="button" class="dynamic-connect" data-id="${dynamicEsc(node.id)}" title="Arraste para conectar">+</button>`;
          canvas.append(card);
        });
        dynamicRenderEdges();
        dynamicBindCanvas();
      }
      function dynamicEditorMarkup() {
        return `<div class="dynamic-editor"><div class="dynamic-editor-head"><div><p class="eyebrow">EDITOR VISUAL</p><h2>${dynamicEsc(dynamicDraft.name)}</h2><p class="dynamic-muted">Arraste os quadrados. Use o + centralizado e arraste até outro quadrado para criar uma conexão. Use ✎ para editar e × para excluir.</p></div><div class="dynamic-actions"><button type="button" class="secondary" id="dynamicCancel">Cancelar</button><button type="button" class="primary" id="dynamicSave">Salvar produto</button></div></div><div class="dynamic-canvas-toolbar"><button type="button" class="secondary" id="dynamicAddNode">+ Adicionar etapa/componente</button></div><div id="dynamicCanvas" class="dynamic-canvas"></div></div>`;
      }
      function dynamicSaveData() {
        const data = {
          ...dynamicDraft,
          nodes: dynamicDraft.nodes.map((node) => ({ ...node })),
          links: dynamicDraft.links.map((edge) => ({
            from: edge.from,
            to: edge.to,
            quantity: Number(edge.quantity || 1),
            label: String(edge.quantity || 1),
          })),
        };
        data.nodes.forEach((node) => { node.parent_id = null; });
        for (const edge of data.links) {
          const target = data.nodes.find((node) => node.id === edge.to);
          if (target) {
            target.parent_id = edge.from;
            target.quantity_per_parent = edge.quantity;
          }
        }
        return data;
      }
      function renderDynamicEditor() {
        const editor = $("#dynamicEditor"),
          empty = $("#dynamicEmpty");
        if (!editor || !dynamicDraft) return;
        dynamicMode = "canvas";
        empty.hidden = true;
        editor.hidden = false;
        editor.innerHTML = dynamicEditorMarkup();
        renderDynamicCanvas();
        $("#dynamicCancel").onclick = () => {
          dynamicDraft = null;
          selectedDynamicId = null;
          renderDynamicProducts();
        };
        $("#dynamicAddNode").onclick = () => {
          const node = dynamicNewNode({
            name: "Novo componente",
            x: (dynamicDraft.nodes.length % 4) * 220 + 80,
            y: Math.floor(dynamicDraft.nodes.length / 4) * 130 + 80,
          });
          dynamicDraft.nodes.push(node);
          renderDynamicEditor();
          dynamicNodeModal(node);
        };
        $("#dynamicSave").onclick = async () => {
          try {
            const saved = await post(
              "/api/dynamic-products/" + dynamicDraft.id,
              dynamicSaveData(),
              "PUT",
            );
            D.dynamicProducts = D.dynamicProducts.map((product) =>
              product.id === saved.id ? saved : product,
            );
            dynamicDraft = dynamicNewDraft(saved);
            toast("Produto dinâmico salvo");
            renderDynamicProducts();
          } catch (error) {
            toast(error.message);
          }
        };
      }
      async function dynamicPersistTree() {
        try {
          const saved = await post(
            "/api/dynamic-products/" + dynamicDraft.id,
            dynamicSaveData(),
            "PUT",
          );
          D.dynamicProducts = D.dynamicProducts.map((product) =>
            product.id === saved.id ? saved : product,
          );
          dynamicDraft = dynamicNewDraft(saved);
          toast("Alteração salva");
          return saved;
        } catch (error) {
          toast(error.message);
          return null;
        }
      }
      function dynamicProductEditModal() {
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Editar produto dinâmico</h2><label>Nome do produto<input id="dynProductEditName" value="${dynamicEsc(dynamicDraft.name)}" autofocus required></label><label>Tipo de unidade<input id="dynProductEditUnit" value="${dynamicEsc(dynamicDraft.unit || "UN")}" required></label><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynProductEditBack">Cancelar</button><button type="button" class="primary" id="dynProductEditSave">Salvar alterações</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynProductEditBack").onclick = closeDynamicModal;
        host.querySelector("#dynProductEditSave").onclick = async () => {
          const name = host.querySelector("#dynProductEditName").value.trim();
          if (!name) return toast("Informe o nome do produto.");
          dynamicDraft.name = name;
          dynamicDraft.unit =
            host.querySelector("#dynProductEditUnit").value.trim() || "UN";
          await dynamicPersistTree();
          closeDynamicModal();
          renderDynamicTree();
        };
        host.querySelector("#dynProductEditName").focus();
      }
      async function dynamicCloneProduct(productId) {
        const source = dynamicProductById(productId);
        if (!source) return;
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Clonar produto dinâmico</h2><p class="dynamic-muted">O Canvas e a Tree serão copiados integralmente.</p><label>Nome do novo produto<input id="dynCloneName" value="${dynamicEsc(source.name + " - Cópia")}" autofocus required></label><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynCloneCancel">Cancelar</button><button type="button" class="primary" id="dynCloneSave">Clonar produto</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynCloneCancel").onclick = closeDynamicModal;
        host.querySelector("#dynCloneSave").onclick = async () => {
          const name = host.querySelector("#dynCloneName").value.trim();
          if (!name) return toast("Informe o nome do novo produto.");
          const clone = dynamicNewDraft(source);
          clone.id = "";
          clone.name = name;
          clone.nodes = clone.nodes.map((node) => ({
            ...node,
            id: dynId("NODE"),
            parent_id: null,
          }));
          const oldToNew = new Map(
            source.nodes.map((node, index) => [node.id, clone.nodes[index].id]),
          );
          clone.nodes.forEach((node, index) => {
            const old = source.nodes[index];
            node.parent_id = old.parent_id
              ? oldToNew.get(old.parent_id) || null
              : null;
          });
          clone.links = (source.links || [])
            .map((link) => ({
              ...link,
              from: oldToNew.get(link.from),
              to: oldToNew.get(link.to),
            }))
            .filter((link) => link.from && link.to);
          try {
            const saved = await post("/api/dynamic-products", {
              name: clone.name,
              unit: clone.unit,
              nodes: clone.nodes,
              links: clone.links,
              structure_locked: false,
            });
            D.dynamicProducts = [saved, ...D.dynamicProducts];
            selectedDynamicId = saved.id;
            dynamicDraft = dynamicNewDraft(saved);
            closeDynamicModal();
            toast("Produto dinâmico duplicado. Edite o Canvas e salve quando terminar.");
            renderDynamicEditor();
          } catch (error) {
            toast(error.message);
          }
        };
        host.querySelector("#dynCloneName").focus();
      }
      async function dynamicDeleteProduct(productId) {
        try {
          await post("/api/dynamic-products/" + productId, {}, "DELETE");
          D.dynamicProducts = D.dynamicProducts.filter(
            (product) => product.id !== productId,
          );
          D.dynamicConnections = (D.dynamicConnections || []).filter(
            (connection) =>
              connection.fromProductId !== productId &&
              connection.toProductId !== productId,
          );
          await dynamicPersistConnections();
          selectedDynamicId = null;
          dynamicDraft = null;
          toast("Produto dinâmico excluído");
          renderDynamicProducts();
        } catch (error) {
          toast(error.message);
        }
      }
      function dynamicTreeNodeMarkup(node, quantityMarkup = "") {
        return `<div class="dynamic-tree-node"><div class="dynamic-tree-node-main"><strong>${dynamicEsc(node.name)}</strong><small>${dynamicEsc(node.unit || "UN")}</small></div>${quantityMarkup}</div>`;
      }
      function dynamicTreeBranch(node, seen = new Set()) {
        if (seen.has(node.id)) return "";
        const next = new Set(seen);
        next.add(node.id);
        return dynamicDraft.nodes
          .filter((child) => child.parent_id === node.id)
          .map((child) => {
            const edge = dynamicDraft.links.find(
                (link) => link.from === node.id && link.to === child.id,
              ),
              quantity = edge?.quantity ?? child.quantity_per_parent;
            return `<div class="dynamic-tree-branch">${dynamicTreeNodeMarkup(child, `<button type="button" class="dynamic-tree-qty" data-edge-from="${dynamicEsc(node.id)}" data-edge-to="${dynamicEsc(child.id)}">${Number(quantity || 1)}</button>`)}${dynamicTreeBranch(child, next)}</div>`;
          })
          .join("");
      }
      function renderDynamicTree() {
        dynamicMode = "tree";
        const editor = $("#dynamicEditor"),
          empty = $("#dynamicEmpty");
        if (!editor || !dynamicDraft) return;
        empty.hidden = true;
        editor.hidden = false;
        const roots = dynamicDraft.nodes.filter((node) => !node.parent_id);
        const baseOptions = [`<option value="">Sem base selecionada</option>`, ...(dynamicDraft.nodes || []).map((node) => `<option value="${dynamicEsc(node.id)}" ${dynamicDraft.stock_base_node_id === node.id ? "selected" : ""}>${dynamicEsc(node.name)} · ${dynamicEsc(node.unit || "UN")}</option>`)].join("");
        editor.innerHTML = `<div class="dynamic-tree-view"><div class="dynamic-tree-head"><div><p class="eyebrow">ESTRUTURA DO PRODUTO</p><h2>${dynamicEsc(dynamicDraft.name)}</h2><p class="dynamic-muted">Composição protegida após o salvamento. Você pode alterar o nome do produto, quantidades, unidade e base de estoque. Para criar ou alterar componentes, use Clonar produto.</p><label class="dynamic-stock-base"><strong>Base usada para o estoque do produto</strong><select id="dynamicStockBase">${baseOptions}</select><small>O saldo exibido no catálogo será o saldo desta base. Se ela estiver conectada a outro produto, o saldo será compartilhado.</small></label></div><div class="dynamic-tree-actions"><button type="button" class="secondary" id="dynamicBackList">Voltar</button><button type="button" class="secondary" id="dynamicCloneTree">Clonar produto</button><button type="button" class="secondary" id="dynamicConnectProducts">Conectar produtos</button></div></div><div class="dynamic-tree">${roots.map((node) => dynamicTreeNodeMarkup(node) + dynamicTreeBranch(node)).join("")}</div></div>`;
        $("#dynamicStockBase").onchange = async (event) => {
          dynamicDraft.stock_base_node_id = event.target.value || "";
          await dynamicPersistTree();
          renderDynamicTree();
          renderDynamicProducts();
        };
        $("#dynamicBackList").onclick = () => {
          selectedDynamicId = null;
          dynamicDraft = null;
          renderDynamicProducts();
        };
        $("#dynamicCloneTree").onclick = () =>
          dynamicCloneProduct(dynamicDraft.id);
        $("#dynamicConnectProducts").onclick = dynamicProductConnectionsModal;
        if (!dynamicDraft.structure_locked) {
          const editCanvas = document.createElement("button");
          editCanvas.type = "button";
          editCanvas.className = "primary";
          editCanvas.id = "dynamicEditCanvas";
          editCanvas.textContent = "Editar canvas";
          $("#dynamicCloneTree")?.parentElement?.append(editCanvas);
          editCanvas.onclick = renderDynamicEditor;
        }
        $$(".dynamic-tree-qty").forEach(
          (button) =>
            (button.onclick = () => {
              const edge = dynamicDraft.links.find(
                (link) =>
                  link.from === button.dataset.edgeFrom &&
                  link.to === button.dataset.edgeTo,
              );
              if (edge) dynamicEdgeModal(edge);
            }),
        );
      }
      function dynamicConnectionNodeId(productId, nodeId) {
        return `dc-${productId}-${nodeId}`;
      }
      function dynamicConnectionNodes() {
        const result = [];
        (D.dynamicProducts || []).forEach((product, productIndex) => {
          (product.nodes || []).forEach((node, nodeIndex) => {
            result.push({
              product,
              node,
              x: 30 + productIndex * 300,
              y: 70 + nodeIndex * 92,
            });
          });
        });
        return result;
      }
      function dynamicConnectionPoint(record, side) {
        return { x: record.x + (side === "from" ? 245 : 0), y: record.y + 34 };
      }
      async function dynamicPersistConnections() {
        const saved = await post(
          "/api/dynamic-product-connections",
          { connections: D.dynamicConnections || [] },
          "PUT",
        );
        D.dynamicConnections = saved.connections || [];
      }
      function dynamicCrossConnectionModal(connection, onChanged = null) {
        const fromProduct = dynamicProductById(connection.fromProductId), toProduct = dynamicProductById(connection.toProductId);
        const fromNode = fromProduct?.nodes?.find((node) => node.id === connection.fromNodeId), toNode = toProduct?.nodes?.find((node) => node.id === connection.toNodeId);
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop";
        host.innerHTML = `<div class="dynamic-modal"><h2>Conexão de estoque compartilhado</h2><p class="dynamic-muted">${dynamicEsc(fromProduct?.name || connection.fromProductId)} · ${dynamicEsc(fromNode?.name || connection.fromNodeId)} ↔ ${dynamicEsc(toProduct?.name || connection.toProductId)} · ${dynamicEsc(toNode?.name || connection.toNodeId)}</p><p class="dynamic-muted">O vínculo será removido imediatamente. O saldo atual não será duplicado: ficará no primeiro componente; ajuste o outro pela contagem de estoque se necessário.</p><div class="dynamic-modal-actions"><button type="button" class="secondary" id="dynamicCrossCancel">Cancelar</button><button type="button" class="danger" id="dynamicCrossDisconnect">Desconectar</button></div></div>`;
        document.body.append(host);
        host.querySelector("#dynamicCrossCancel").onclick = (event) => { event.preventDefault(); closeDynamicModal(host); };
        host.querySelector("#dynamicCrossDisconnect").onclick = async (event) => {
          event.preventDefault();
          const previous = D.dynamicConnections || [];
          D.dynamicConnections = previous.filter((item) => item !== connection);
          try {
            await dynamicPersistConnections();
            closeDynamicModal(host);
            if (onChanged) onChanged();
            await load();
            if (onChanged) onChanged();
            toast("Conexão removida");
          } catch (error) {
            D.dynamicConnections = previous;
            if (onChanged) onChanged();
            toast(error.message);
          }
        };
      }
      function dynamicProductConnectionsModal() {
        const host = document.createElement("div");
        host.className = "dynamic-modal-backdrop dynamic-connections-backdrop";
        host.innerHTML = `<div class="dynamic-connections-modal"><div class="dynamic-connections-head"><div><p class="eyebrow">CONEXÃO DE PRODUTOS DINÂMICOS</p><h2>Componentes compartilhados</h2><p class="dynamic-muted">Arraste o ponto + de um componente até outro. A conexão indica que eles representam a mesma peça, mesmo em produtos diferentes.</p></div><div class="dynamic-actions"><button type="button" class="secondary" id="dynamicConnectionsCancel">Voltar</button><button type="button" class="primary" id="dynamicConnectionsSave">Salvar conexões</button></div></div><div id="dynamicConnectionsCanvas" class="dynamic-connections-canvas"></div></div>`;
        document.body.append(host);
        const canvas = host.querySelector("#dynamicConnectionsCanvas");
        let drag = null;
        const records = dynamicConnectionNodes();
        canvas.innerHTML = records
          .map(
            (record) =>
              `<div class="dynamic-connection-node" id="${dynamicConnectionNodeId(record.product.id, record.node.id)}" data-product-id="${dynamicEsc(record.product.id)}" data-node-id="${dynamicEsc(record.node.id)}" style="left:${record.x}px;top:${record.y}px"><small>${dynamicEsc(record.product.name)}</small><strong>${dynamicEsc(record.node.name)}</strong><button type="button" class="dynamic-connection-handle" title="Arraste para conectar">+</button></div>`,
          )
          .join("");
        const draw = () => {
          canvas
            .querySelectorAll(".dynamic-cross-line, .dynamic-cross-remove")
            .forEach((line) => line.remove());
          (D.dynamicConnections || []).forEach((connection) => {
            const from = records.find(
                (record) =>
                  record.product.id === connection.fromProductId &&
                  record.node.id === connection.fromNodeId,
              ),
              to = records.find(
                (record) =>
                  record.product.id === connection.toProductId &&
                  record.node.id === connection.toNodeId,
              );
            if (!from || !to) return;
            const a = dynamicConnectionPoint(from, "from"),
              b = dynamicConnectionPoint(to, "to"),
              line = document.createElement("div");
            line.className = "dynamic-cross-line";
            line.title = "Clique para desconectar";
            line.style.cursor = "pointer";
            line.onclick = (event) => { event.stopPropagation(); dynamicCrossConnectionModal(connection, draw); };
            line.style.width = Math.hypot(b.x - a.x, b.y - a.y) + "px";
            line.style.transform = `translate(${a.x}px,${a.y}px) rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "dynamic-cross-remove";
            remove.title = "Desconectar componentes";
            remove.setAttribute("aria-label", "Desconectar componentes");
            remove.textContent = "×";
            remove.style.left = `${(a.x + b.x) / 2 - 11}px`;
            remove.style.top = `${(a.y + b.y) / 2 - 11}px`;
            remove.onclick = (event) => { event.stopPropagation(); dynamicCrossConnectionModal(connection, draw); };
            canvas.append(line, remove);
          });
        };
        const findRecord = (element) =>
          records.find(
            (record) =>
              record.product.id === element.dataset.productId &&
              record.node.id === element.dataset.nodeId,
          );
        const dynamicConnectionCanvasPoint = (event) => {
          const rect = canvas.getBoundingClientRect();
          return {
            x: event.clientX - rect.left + canvas.scrollLeft,
            y: event.clientY - rect.top + canvas.scrollTop,
          };
        };
        canvas.querySelectorAll(".dynamic-connection-handle").forEach(
          (button) =>
            (button.onpointerdown = (event) => {
              event.preventDefault();
              event.stopPropagation();
              const record = findRecord(button.parentElement);
              drag = {
                record,
                line: document.createElement("div"),
                start: dynamicConnectionPoint(record, "from"),
              };
              drag.line.className = "dynamic-cross-line dynamic-cross-preview";
              canvas.append(drag.line);
            }),
        );
        canvas.onpointermove = (event) => {
          if (!drag) return;
          const point = dynamicConnectionCanvasPoint(event);
          drag.line.style.width =
            Math.hypot(point.x - drag.start.x, point.y - drag.start.y) + "px";
          drag.line.style.transform = `translate(${drag.start.x}px,${drag.start.y}px) rotate(${Math.atan2(point.y - drag.start.y, point.x - drag.start.x)}rad)`;
        };
        canvas.onpointerup = (event) => {
          if (!drag) return;
          const target = event.target.closest(".dynamic-connection-node"),
            targetRecord = target ? findRecord(target) : null;
          if (
            targetRecord &&
            !(
              targetRecord.product.id === drag.record.product.id &&
              targetRecord.node.id === drag.record.node.id
            )
          ) {
            const exists = (D.dynamicConnections || []).some(
              (connection) =>
                (connection.fromProductId === drag.record.product.id &&
                  connection.fromNodeId === drag.record.node.id &&
                  connection.toProductId === targetRecord.product.id &&
                  connection.toNodeId === targetRecord.node.id) ||
                (connection.fromProductId === targetRecord.product.id &&
                  connection.fromNodeId === targetRecord.node.id &&
                  connection.toProductId === drag.record.product.id &&
                  connection.toNodeId === drag.record.node.id),
            );
            if (!exists)
              D.dynamicConnections.push({
                id: dynId("CONN"),
                fromProductId: drag.record.product.id,
                fromNodeId: drag.record.node.id,
                toProductId: targetRecord.product.id,
                toNodeId: targetRecord.node.id,
              });
          }
          drag.line.remove();
          drag = null;
          draw();
        };
        canvas.onpointercancel = () => {
          if (drag) drag.line.remove();
          drag = null;
        };
        draw();
        host.querySelector("#dynamicConnectionsCancel").onclick =
          closeDynamicModal;
        host.querySelector("#dynamicConnectionsSave").onclick = async () => {
          try {
            await dynamicPersistConnections();
            closeDynamicModal();
            await load();
            toast("Conexões entre produtos salvas");
          } catch (error) {
            toast(error.message);
          }
        };
      }
      function dynamicBaseNode(product) {
        return (product.nodes || []).find((node) => node.id === product.stock_base_node_id) || (product.nodes || []).find((node) => !node.parent_id) || (product.nodes || [])[0];
      }
      function dynamicAvailableStock(product, warehouseId = "all") {
        const base = dynamicBaseNode(product);
        if (!base) return 0;
        const stockFor = (groupId) => (D.dynamicStock || []).filter((row) => row.group_id === groupId && (!warehouseId || warehouseId === "all" || row.warehouse_id === warehouseId)).reduce((total, row) => total + Number(row.quantity || 0), 0);
        const availableForNode = (node, isTop = false) => {
          const children = (product.nodes || []).filter((child) => child.parent_id === node.id);
          if (!children.length) return stockFor(String(node.stock_group_id || node.id));
          const childCapacity = Math.min(...children.map((child) => availableForNode(child, false) / Math.max(1, Number(child.quantity_per_parent || 1))));
          // No nível escolhido como base, os subprodutos podem montar a base.
          // Nos níveis internos, o próprio subproduto precisa existir além dos filhos.
          return isTop ? Math.max(0, Math.floor(childCapacity)) : Math.max(0, Math.min(stockFor(String(node.stock_group_id || node.id)), Math.floor(childCapacity)));
        };
        return availableForNode(base, true);
      }
      function dynamicSelectedBaseStock(product, warehouseId = "all") {
        const base = dynamicBaseNode(product);
        return base ? dynamicStockForNode(base, warehouseId) : 0;
      }
      function dynamicProductBaseStock(product) {
        return dynamicSelectedBaseStock(product, $("#globalWarehouse")?.value || "all");
      }
      function renderDynamicProducts() {
        const list = $("#dynamicProductList");
        if (!list) return;
        const query = String($("#dynamicSearch")?.value || "").toLowerCase();
        const items = (D.dynamicProducts || []).filter((product) =>
          `${product.name} ${product.sku || ""}`.toLowerCase().includes(query),
        );
        list.innerHTML =
          items
            .map(
              (product) =>
                `<div class="dynamic-list-item ${product.id === selectedDynamicId ? "active" : ""}" data-id="${dynamicEsc(product.id)}"><div class="dynamic-list-main"><strong>${dynamicEsc(product.name)}</strong><small><span class="dynamic-lock-badge">Composição protegida</span> · ${(product.nodes || []).length} componentes · base: ${dynamicEsc(dynamicBaseNode(product)?.name || "não selecionada")} · estoque: ${dynamicProductBaseStock(product)}</small></div><div class="dynamic-list-actions"><button type="button" class="dynamic-list-icon dynamic-list-edit" data-id="${dynamicEsc(product.id)}" title="Editar produto">✎</button><button type="button" class="dynamic-list-icon dynamic-list-clone" data-id="${dynamicEsc(product.id)}" title="Clonar produto">⧉</button><button type="button" class="dynamic-list-icon dynamic-list-delete" data-id="${dynamicEsc(product.id)}" title="Excluir produto">×</button></div></div>`,
            )
            .join("") ||
          '<p class="dynamic-muted">Nenhum produto dinâmico cadastrado.</p>';
        $$(".dynamic-list-item").forEach(
          (item) =>
            (item.onclick = (event) => {
              if (event.target.closest(".dynamic-list-icon")) return;
              selectedDynamicId = item.dataset.id;
              dynamicDraft = dynamicNewDraft(
                dynamicProductById(selectedDynamicId),
              );
              renderDynamicProducts();
            }),
        );
        $$(".dynamic-list-edit").forEach(
          (button) =>
            (button.onclick = (event) => {
              event.stopPropagation();
              selectedDynamicId = button.dataset.id;
              dynamicDraft = dynamicNewDraft(
                dynamicProductById(selectedDynamicId),
              );
              dynamicProductEditModal();
            }),
        );
        $$(".dynamic-list-clone").forEach(
          (button) =>
            (button.onclick = (event) => {
              event.stopPropagation();
              dynamicCloneProduct(button.dataset.id);
            }),
        );
        $$(".dynamic-list-delete").forEach(
          (button) =>
            (button.onclick = (event) => {
              event.stopPropagation();
              dynamicDeleteProduct(button.dataset.id);
            }),
        );
        const editor = $("#dynamicEditor"),
          empty = $("#dynamicEmpty");
        if (selectedDynamicId && dynamicDraft) renderDynamicTree();
        else {
          editor.hidden = true;
          empty.hidden = false;
        }
        $("#newDynamicProduct").onclick = dynamicInitialModal;
      }
      $("#dynamicSearch").oninput = renderDynamicProducts;
      /* Catálogo unificado: produtos comuns, terceirização, dinâmicos e kits. */
      const originalRenderProductDetail = renderCommonProductDetail;
      const originalProductActionsHTML =
        $(".product-actions-panel")?.innerHTML || "";
      function unifiedCatalog() {
        const common = (D.products || []).map((p) => ({
          ...p,
          catalogId: p.id,
          catalogType: "common",
          catalogLabel: "Produto comum",
        }));
        const outsourcing = (D.outsourcingProducts || [])
          .filter((name) => D.outsourcingProductStatus?.[name] !== false)
          .map((name) => {
            const m = D.outsourcingMeta?.[name] || {};
            return {
              ...m,
              name,
              catalogId: "terc:" + name,
              catalogType: "outsourcing",
              catalogLabel: "Terceirização",
              sku: m.sku || "—",
              unit: m.unit || "UN",
              min: Number(m.min || 0),
              max: Number(m.max || 0),
              category: m.category || "",
              subcategory: m.subcategory || "",
            };
          });
        const dynamic = (D.dynamicProducts || []).map((p) => ({
          ...p,
          catalogId: "dynamic:" + p.id,
          catalogType: "dynamic",
          catalogLabel: "Produto dinâmico",
          unit: p.unit || "UN",
          min: Number(p.min || 0),
          max: Number(p.max || 0),
          category: p.category || "",
        }));
        const kits = (D.kits || []).map((k) => ({
          ...k,
          catalogId: "kit:" + k.id,
          catalogType: "kit",
          catalogLabel: "Kit",
          unit: k.unit || "KIT",
          min: Number(k.min || 0),
          max: Number(k.max || 0),
          sku: k.sku || "—",
          category: k.category || "",
        }));
        return [...common, ...outsourcing, ...dynamic, ...kits];
      }
      function unifiedById(id) {
        return unifiedCatalog().find((x) => x.catalogId === id);
      }
      function unifiedQty(item, wid) {
        const selected = wid && wid !== "all" ? wid : null;
        if (item.catalogType === "common") return qty(item.id, wid);
        if (item.catalogType === "outsourcing")
          return (D.outsourcingStock || [])
            .filter(
              (x) =>
                x.product_name === item.name &&
                (!selected || x.warehouse_id === selected),
            )
            .reduce((a, x) => a + Number(x.quantity || 0), 0);
        if (item.catalogType === "dynamic") {
          // A base escolhida na Tree define somente a unidade exibida no catálogo.
          // A capacidade da composição continua sendo calculada separadamente no dashboard.
          return dynamicSelectedBaseStock(item, selected || "all");
        }
        if (item.catalogType === "kit") {
          const vals = (item.items || []).map((i) => {
            const p = D.products.find((x) => x.id === i.product_id);
            return p ? Math.floor(qty(p.id, wid) / Number(i.quantity || 1)) : 0;
          });
          return vals.length ? Math.min(...vals) : 0;
        }
        return 0;
      }
      function unifiedState(item) {
        const total = unifiedQty(item, $("#globalWarehouse")?.value || "all"),
          min = Number(item.min || 0),
          max = Number(item.max || 0),
          st =
            total === 0
              ? "zero"
              : total < min
                ? "low"
                : total > max
                  ? "high"
                  : "ok";
        return {
          total,
          state: st,
          label: {
            zero: "Sem estoque",
            low: "Abaixo do mínimo",
            high: "Acima do máximo",
            ok: "Estoque normal",
          }[st],
        };
      }
      function unifiedCategory(item) {
        return item.category || item.subcategory || "";
      }
      function renderUnifiedFilters() {
        const sel = $("#categoryFilter");
        if (!sel) return;
        const old = sel.value,
          names = [
            ...new Set(unifiedCatalog().map(unifiedCategory).filter(Boolean)),
          ].sort((a, b) => a.localeCompare(b, "pt-BR"));
        sel.innerHTML =
          '<option value="">Todas categorias</option>' +
          names
            .map((x) => `<option value="${esc(x)}">${esc(x)}</option>`)
            .join("");
        if (names.includes(old)) sel.value = old;
      }
      function editOutsourcingMeta(item) {
        const m = D.outsourcingMeta?.[item.name] || {};
        openModal(
          `<h2>Editar produto de terceirização</h2><p class="product-meta">O nome é fixo porque pertence à terceirização.</p><form id="outMetaForm" class="modal-form"><label>Nome<input value="${esc(item.name)}" disabled></label><label>SKU<input name="sku" value="${esc(m.sku || "")}"></label><label>Categoria<input name="category" value="${esc(m.category || "")}"></label><label>Subcategoria<input name="subcategory" value="${esc(m.subcategory || "")}"></label><label>Tipo de unidade<input name="unit" value="${esc(m.unit || "UN")}"></label><label>Marca<input name="brand" value="${esc(m.brand || "")}"></label><label>Estoque mínimo<input name="min" type="number" value="${Number(m.min || 0)}"></label><label>Estoque máximo<input name="max" type="number" value="${Number(m.max || 0)}"></label><button class="primary">Salvar informações</button></form>`,
        );
        $("#outMetaForm").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target),
            meta = Object.fromEntries(f);
          meta.min = Number(meta.min || 0);
          meta.max = Number(meta.max || 0);
          try {
            await post(
              "/api/outsourcing-products/" + encodeURIComponent(item.name),
              { meta },
              "PUT",
            );
            $("#modal").classList.remove("open");
            toast("Produto de terceirização atualizado");
            await load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function todayInputValue() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
      }
      function dynamicLastNodeKey(productId) {
        return `estoque:dynamic:last-node:${productId}`;
      }
      function dynamicLastNode(product) {
        const root =
          (product.nodes || []).find((n) => !n.parent_id) ||
          (product.nodes || [])[0];
        try {
          return (
            localStorage.getItem(dynamicLastNodeKey(product.id)) ||
            root?.id ||
            ""
          );
        } catch (_) {
          return root?.id || "";
        }
      }
      function rememberDynamicNode(productId, nodeId) {
        try {
          if (nodeId)
            localStorage.setItem(dynamicLastNodeKey(productId), nodeId);
        } catch (_) {}
      }
      function virtualOperationMarkup(item) {
        if (item.catalogType === "dynamic") {
          const roots = (item.nodes || []).filter((n) => !n.parent_id),
            last = dynamicLastNode(item),
            options = (item.nodes || [])
              .map(
                (n) =>
                  `<option value="${esc(n.id)}" ${n.id === last ? "selected" : ""}>${esc(n.name)}${roots.some((r) => r.id === n.id) ? " (principal)" : ""}</option>`,
              )
              .join("");
          return `<div class="virtual-tree-operation"><p class="product-meta">O componente principal vem selecionado por padrão. O último componente usado fica salvo para a próxima movimentação.</p><label>Componente da Tree<select class="virtualNode" name="node_id">${options}</select></label></div>`;
        }
        if (item.catalogType === "kit")
          return `<p class="product-meta">A movimentação do kit movimenta automaticamente os produtos da composição.</p><div class="product-kits-list">${(item.items || []).map((i) => `<span class="tag">${i.quantity} × ${esc(pName(i.product_id))}</span>`).join("")}</div>`;
        return "";
      }
      function dynamicReceiptMarkup(item) {
        const options = (item.nodes || []).map((n) => `<option value="${esc(n.id)}">${esc(n.name)} · falta recebida</option>`).join("");
        return `<div class="dynamic-receipt-fields"><label class="check-line"><input type="checkbox" name="has_shortages" class="dynamic-has-shortages"> Entrada com falta de componente</label><div class="dynamic-shortages" hidden><div class="dynamic-shortage-rows"><div class="dynamic-shortage-row"><select name="shortage_node_id">${options}</select><input name="shortage_quantity" type="number" min="0.01" step="0.01" placeholder="Quantidade faltante"><input name="shortage_note" placeholder="Observação"><button type="button" class="secondary dynamic-remove-shortage">×</button></div></div><button type="button" class="secondary dynamic-add-shortage">+ Adicionar outro componente faltante</button><small class="dynamic-muted">A quantidade faltante não entra no estoque do componente e vira uma task pendente.</small></div></div>`;
      }
      function renderVirtualDetail(item) {
        const panel = $(".product-actions-panel"),
          root = $("#productDetailSummary");
        if (!panel || !root) return;
        const tag = item.catalogLabel,
          stocks = (D.warehouses || [])
            .map(
              (w) =>
                `<span class="tag"><strong>${esc(w.name)}:</strong> ${unifiedQty(item, w.id)} ${esc(item.unit || "UN")}</span>`,
            )
            .join("");
        $("#productDetailTitle").textContent = item.name;
        $("#productDetailMeta").textContent =
          `${tag} · SKU ${item.sku || "—"} · Unidade ${item.unit || "UN"} · ${unifiedCategory(item) || "Sem categoria"}`;
        root.innerHTML = `<span class="tag"><strong>${esc(tag)}</strong></span>${stocks}<span class="tag">Mínimo: ${Number(item.min || 0)}</span><span class="tag">Máximo: ${Number(item.max || 0)}</span>`;
        panel.innerHTML = `<h3>Operações deste item</h3>${item.catalogType === "outsourcing" ? '<button type="button" class="secondary" id="virtualEditMeta">Editar informações</button>' : ""}<button type="button" class="operation-toggle" data-virtual-op="entry">Registrar entrada no estoque</button><form id="virtualEntry" class="product-operation-panel" data-virtual-panel="entry"><div class="action-grid"><label>Estoque<select name="warehouse_id">${detailStockOptions($("#globalWarehouse")?.value || D.warehouses[0]?.id)}</select></label><label>Quantidade<input name="quantity" type="number" min="0.01" step="0.01" required></label></div>${virtualOperationMarkup(item)}${item.catalogType === "dynamic" ? dynamicReceiptMarkup(item) : ""}<label>Data<input name="date" type="date" value="${todayInputValue()}"></label><label>Observação<input name="note"></label><button class="primary">Registrar entrada no estoque</button></form><button type="button" class="operation-toggle" data-virtual-op="exit">Registrar saída</button><form id="virtualExit" class="product-operation-panel" data-virtual-panel="exit"><div class="action-grid"><label>Estoque<select name="warehouse_id">${detailStockOptions($("#globalWarehouse")?.value || D.warehouses[0]?.id)}</select></label><label>Quantidade<input name="quantity" type="number" min="0.01" step="0.01" required></label></div>${virtualOperationMarkup(item)}<label>Data<input type="date" name="date" value="${todayInputValue()}"></label><label>Observação<input name="note"></label><button class="primary">Registrar saída</button></form>`;
        const shortageBox = panel.querySelector("#virtualEntry .dynamic-shortages");
        const shortageToggle = panel.querySelector("#virtualEntry .dynamic-has-shortages");
        if (shortageToggle && shortageBox) shortageToggle.onchange = () => { shortageBox.hidden = !shortageToggle.checked; };
        panel.querySelector("#virtualEntry .dynamic-add-shortage")?.addEventListener("click", () => {
          const rows = panel.querySelector("#virtualEntry .dynamic-shortage-rows"), template = rows?.querySelector(".dynamic-shortage-row");
          if (!rows || !template) return;
          const clone = template.cloneNode(true);
          clone.querySelectorAll("input").forEach((input) => { input.value = ""; });
          rows.append(clone); bindShortageRemoveButtons();
        });
        function bindShortageRemoveButtons() { panel.querySelectorAll("#virtualEntry .dynamic-remove-shortage").forEach((button) => button.onclick = () => { const rows = panel.querySelectorAll("#virtualEntry .dynamic-shortage-row"); if (rows.length > 1) button.closest(".dynamic-shortage-row")?.remove(); }); }
        bindShortageRemoveButtons();
        panel.querySelectorAll(".operation-toggle").forEach(
          (b) =>
            (b.onclick = () => {
              panel
                .querySelectorAll(".operation-toggle")
                .forEach((x) =>
                  x.classList.toggle(
                    "active",
                    x === b && !x.classList.contains("active"),
                  ),
                );
              panel
                .querySelectorAll(".product-operation-panel")
                .forEach((x) =>
                  x.classList.toggle(
                    "open",
                    x.dataset.virtualPanel === b.dataset.virtualOp &&
                      b.classList.contains("active"),
                  ),
                );
            }),
        );
        if ($("#virtualEditMeta"))
          $("#virtualEditMeta").onclick = () => editOutsourcingMeta(item);
        panel.querySelectorAll(".virtualNode").forEach(
          (select) =>
            (select.onchange = () => {
              rememberDynamicNode(item.id, select.value);
              panel.querySelectorAll(".virtualNode").forEach((other) => {
                other.value = select.value;
              });
            }),
        );
        ["Entry", "Exit"].forEach(
          (s) =>
            ($("#virtual" + s).onsubmit = (e) =>
              submitVirtualOperation(e, item, s === "Entry" ? "IN" : "OUT")),
        );
        const itemGroups = new Set((item.nodes || []).map((node) => String(node.stock_group_id || node.id)));
        const dynamicHistory = (D.dynamicMovements || []).filter((m) => m.product_id === item.id || Object.keys(m.expanded || {}).some((groupId) => itemGroups.has(String(groupId))));
        $("#productDetailHistory").innerHTML = dynamicHistory.length ? dynamicHistory.map((m) => {
          const sign = m.type === "OUT" ? -1 : 1;
          const shortages = (m.shortages || []).map((x) => `${x.quantity} faltante(s)`).join(", ");
          const purchase = m.purchase_label ? `Compra: ${esc(m.purchase_label)}${m.purchase_date ? ` · ${esc(m.purchase_date)}` : ""}` : "—";
          const sourceProduct = m.product_id !== item.id ? (D.dynamicProducts || []).find((product) => product.id === m.product_id)?.name : "";
          const sourceLabel = sourceProduct ? `Origem conectada: ${esc(sourceProduct)}` : purchase;
          return `<tr><td>${new Date(m.date).toLocaleString("pt-BR")}</td><td class="type-${m.type}">${m.type === "IN" ? "ENTRADA DINÂMICA" : "SAÍDA DINÂMICA"}</td><td>${sign * Number(m.quantity || 0)} ${esc(item.unit || "UN")}</td><td>${esc(wName(m.warehouse_id) || "—")}</td><td>${sourceLabel}</td><td>${esc(shortages ? `Falta: ${shortages}` : m.note || "—")}</td><td class="history-actions">${movementActionMarkup(m)}</td></tr>`;
        }).join("") : '<tr><td colspan="7" class="history-no-results">Nenhuma movimentação registrada para este produto.</td></tr>';
        bindMovementDeleteButtons($("#productDetailHistory"));
      }
      async function submitVirtualOperation(e, item, type) {
        e.preventDefault();
        const f = new FormData(e.target),
          warehouse = String(f.get("warehouse_id") || ""),
          quantity = Number(f.get("quantity"));
        if (!warehouse || !(quantity > 0))
          return toast("Informe estoque e quantidade válida.");
        try {
          if (item.catalogType === "dynamic") {
            const nodeId =
              f.get("node_id") ||
              e.target.querySelector(".virtualNode")?.value ||
              dynamicLastNode(item);
            rememberDynamicNode(item.id, nodeId);
            await post("/api/dynamic-stock", {
              product_id: item.id,
              node_id: nodeId,
              warehouse_id: warehouse,
              quantity,
              type,
              date: f.get("date") || "",
              note: f.get("note") || "",
              purchase_label: f.get("purchase_label") || "",
              purchase_date: f.get("purchase_date") || "",
              purchase_expected_quantity: Number(f.get("purchase_expected_quantity") || 0),
              shortages: f.get("has_shortages") ? [...e.target.querySelectorAll(".dynamic-shortage-row")].map((row) => ({ node_id: row.querySelector("[name=shortage_node_id]")?.value, quantity: Number(row.querySelector("[name=shortage_quantity]")?.value || 0), note: row.querySelector("[name=shortage_note]")?.value || "" })).filter((x) => x.node_id && x.quantity > 0) : [],
            });
          } else if (item.catalogType === "outsourcing") {
            await post("/api/outsourcing-stock", {
              product_name: item.name,
              warehouse_id: warehouse,
              quantity,
              type,
              date: f.get("date") || "",
              note: f.get("note") || "",
            });
          } else {
            await post("/api/movements", {
              type,
              warehouse_id: warehouse,
              date: f.get("date") || "",
              note: f.get("note") || "",
              lines: [{ kit_id: item.id, warehouse_id: warehouse, quantity }],
            });
          }
          toast(type === "IN" ? "Entrada registrada" : "Saída registrada");
          await load();
          renderProductDetail();
        } catch (x) {
          toast(x.message);
        }
      }
      function dynamicInlineNodeStock(item, node) {
        const selected = $("#globalWarehouse")?.value || "all",
          groupId = String(node.stock_group_id || node.id);
        return (D.dynamicStock || [])
          .filter(
            (x) =>
              x.group_id === groupId &&
              (!selected || selected === "all" || x.warehouse_id === selected),
          )
          .reduce((total, x) => total + Number(x.quantity || 0), 0);
      }
      function dynamicInlineTreeRows(
        item,
        parentId = null,
        depth = 0,
        seen = new Set(),
      ) {
        return (item.nodes || [])
          .filter(
            (node) =>
              (node.parent_id || null) === parentId && !seen.has(node.id),
          )
          .map((node) => {
            const next = new Set(seen);
            next.add(node.id);
            const stock = dynamicInlineNodeStock(item, node),
              children = dynamicInlineTreeRows(item, node.id, depth + 1, next);
            return `<div class="dynamic-inline-tree-row" style="--tree-depth:${depth}"><span class="dynamic-inline-tree-name">${esc(node.name)}<small>${esc(node.unit || "UN")}${node.quantity_per_parent && Number(node.quantity_per_parent) !== 1 ? ` · ${node.quantity_per_parent} por pai` : ""}</small></span><strong class="dynamic-inline-tree-stock">${stock} ${esc(node.unit || "UN")}</strong></div>${children}`;
          })
          .join("");
      }
      function dynamicInlineExpansionMarkup(item) {
        const nodes = item.nodes || [];
        if (!nodes.length)
          return `<span class="product-meta">Nenhum componente cadastrado.</span>`;
        return `<div class="dynamic-inline-components"><div class="dynamic-inline-tree-head"><strong>Componentes da Tree</strong><strong>Estoque atual</strong></div>${dynamicInlineTreeRows(item)}</div>`;
      }
      function renderProducts() {
        renderUnifiedFilters();
        const q = ($("#search")?.value || "").toLowerCase(),
          type = $("#typeFilter")?.value || "",
          cat = $("#categoryFilter")?.value || "",
          status = $("#statusFilter")?.value || "",
          items = unifiedCatalog().filter((p) => {
            const text =
              `${p.name} ${p.sku || ""} ${p.brand || ""} ${p.supplier || ""} ${unifiedCategory(p)}`.toLowerCase();
            return (
              (!q || text.includes(q)) &&
              (!type || p.catalogType === type) &&
              (!cat || unifiedCategory(p) === cat) &&
              (!status || unifiedState(p).state === status)
            );
          }),
          grid = $("#productGrid");
        if (!grid) return;
        const card = (p) => {
          const x = unifiedState(p),
            initials = esc((p.name || "?").slice(0, 2).toUpperCase()),
            actions =
              p.catalogType === "common"
                ? `<button class="editProduct" data-id="${esc(p.id)}">Editar</button><button class="deleteProduct" data-id="${esc(p.id)}">Excluir</button>`
                : p.catalogType === "outsourcing"
                  ? `<button class="unified-edit-meta" data-id="${esc(p.catalogId)}">Editar</button>`
                  : p.catalogType === "kit"
                    ? `<button class="editKit" data-id="${esc(p.id)}">Editar</button><button class="deleteKit" data-id="${esc(p.id)}">Excluir</button>`
                    : `<button class="unified-expand" data-id="${esc(p.catalogId)}">Expandir</button><button class="unified-open" data-id="${esc(p.catalogId)}">Abrir</button>`;
          return `<article class="product-row"><div class="product-thumb"><span>${initials}</span></div><div class="product-main"><div class="product-title product-open" data-id="${esc(p.catalogId)}" tabindex="0" role="link">${esc(p.name)}</div><div class="product-meta"><b>${esc(p.catalogLabel)}</b> · SKU ${esc(p.sku || "—")} · Unidade ${esc(p.unit || "UN")} · ${esc(unifiedCategory(p) || "Sem categoria")}</div></div><div class="row-stock"><span class="status ${x.state}">${x.label}</span><strong>${x.total} ${esc(p.unit || "UN")}</strong><small>mín. ${Number(p.min || 0)} · máx. ${Number(p.max || 0)}</small></div><div class="row-actions">${actions}</div>${p.catalogType === "dynamic" ? `<div class="dynamic-inline-expansion" hidden>${dynamicInlineExpansionMarkup(p)}</div>` : ""}</article>`;
        };
        grid.innerHTML = items.length
          ? items.map(card).join("")
          : '<div class="empty">Nenhum item encontrado.</div>';
        grid.querySelectorAll(".unified-expand").forEach(
          (b) =>
            (b.onclick = (e) => {
              e.stopPropagation();
              const row = b.closest(".product-row"),
                details = row?.querySelector(".dynamic-inline-expansion");
              if (!details) return;
              details.hidden = !details.hidden;
              b.textContent = details.hidden ? "Expandir" : "Recolher";
            }),
        );
        grid.querySelectorAll(".unified-open, .product-open").forEach((b) => {
          b.onclick = () => showProductDetail(b.dataset.id);
          b.onkeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              showProductDetail(b.dataset.id);
            }
          };
        });
        grid.querySelectorAll(".unified-edit-meta").forEach(
          (b) =>
            (b.onclick = (e) => {
              e.stopPropagation();
              editOutsourcingMeta(unifiedById(b.dataset.id));
            }),
        );
        grid
          .querySelectorAll(".editProduct")
          .forEach((b) => (b.onclick = () => productModal(pBy(b.dataset.id))));
        grid
          .querySelectorAll(".deleteProduct")
          .forEach((b) => (b.onclick = () => deleteProduct(b.dataset.id)));
        grid
          .querySelectorAll(".editKit")
          .forEach(
            (b) =>
              (b.onclick = () =>
                kitModal(D.kits.find((k) => k.id === b.dataset.id))),
          );
        grid
          .querySelectorAll(".deleteKit")
          .forEach((b) => (b.onclick = () => deleteKit(b.dataset.id)));
      }
      function showProductDetail(id) {
        const item = unifiedById(id);
        selectedProductId = id;
        $("#dashboard").classList.remove("active");
        $("#productDetail").classList.add("active");
        $("#productDetail").scrollIntoView({
          behavior: "instant",
          block: "start",
        });
        renderProductDetail();
      }
      function renderProductDetail() {
        const item = unifiedById(selectedProductId);
        if (item && item.catalogType !== "common")
          return renderVirtualDetail(item);
        if (
          $(".product-actions-panel") &&
          originalProductActionsHTML &&
          $(".product-actions-panel").innerHTML !== originalProductActionsHTML
        )
          $(".product-actions-panel").innerHTML = originalProductActionsHTML;
        return renderCommonProductDetail();
      }
      $("#categoryFilter")?.addEventListener("change", renderProducts);
      $("#typeFilter")?.addEventListener("change", renderProducts);
      $("#search")?.addEventListener("input", renderProducts);
      $("#statusFilter")?.addEventListener("change", renderProducts);
      renderProducts();

      /* Ajustes finais da integração. */
      function bindCommonDetailForms() {
        const entryDate = $("#productEntryForm input[name=date]");
        if (entryDate && !entryDate.value) entryDate.value = new Date().toISOString().slice(0, 10);
        $("#productEntryForm") &&
          ($("#productEntryForm").onsubmit = (e) => {
            e.preventDefault();
            submitProductOperation(e.target, "IN");
          });
        $("#productExitForm") &&
          ($("#productExitForm").onsubmit = (e) => {
            e.preventDefault();
            submitProductOperation(e.target, "OUT");
          });
        $("#productTransferForm") &&
          ($("#productTransferForm").onsubmit = (e) => {
            e.preventDefault();
            submitProductTransfer(e.target);
          });
        $("#productAdjustmentForm") &&
          ($("#productAdjustmentForm").onsubmit = (e) => {
            e.preventDefault();
            submitProductAdjustment(e.target);
          });
        bindProductOperationButtons();
      }
      const previousUnifiedRenderDetail = renderProductDetail;
      renderProductDetail = function () {
        const item = unifiedById(selectedProductId);
        if (item && item.catalogType !== "common")
          return renderVirtualDetail(item);
        if (
          $(".product-actions-panel") &&
          originalProductActionsHTML &&
          $(".product-actions-panel").innerHTML !== originalProductActionsHTML
        )
          $(".product-actions-panel").innerHTML = originalProductActionsHTML;
        const result = originalRenderProductDetail();
        bindCommonDetailForms();
        return result;
      };
      function returnOutModal(f) {
        if (!f) return;
        openModal(
          `<h2>Registrar retorno da família</h2><p class="product-meta">Informe o que voltou e em qual estoque os itens serão registrados.</p><form id="returnOutForm" class="modal-form"><label>Estoque de destino<select name="warehouse_id" required>${detailStockOptions(D.warehouses[0]?.id)}</select></label><div class="return-out-lines">${(f.items || []).map((i, n) => `<div class="return-out-row" data-index="${n}"><strong>${esc(i.product_name)}</strong>${i.quantity_enabled ? `<label>Qtd. retornada<input class="ret-q" type="number" min="0" step="0.01" placeholder="Enviado: ${i.quantity}"></label>` : ""}${i.weight_enabled ? `<label>Peso retornado (kg)<input class="ret-w" type="number" min="0" step="0.001" placeholder="Enviado: ${i.weight} kg"></label>` : ""}<label class="return-check"><input type="checkbox" class="ret-problem-check"> Problema com o produto?</label><label class="return-problem-field">Observação do problema<input class="ret-problem-note" placeholder="Descreva o problema"></label><label class="return-check"><input type="checkbox" class="ret-quality-check"> Acabamento e qualidade</label><label class="return-quality-field">Quantidade com acabamento/qualidade ruim<input class="ret-quality-qty" type="number" min="0" step="0.01" value="0"></label><label class="return-quality-field">Observação específica<input class="ret-quality" placeholder="Opcional"></label></div>`).join("")}</div><label>Observação do retorno<textarea name="notes" rows="3"></textarea></label><button class="primary">Registrar retorno</button></form>`,
        );
        $("#returnOutForm").onsubmit = async (e) => {
          e.preventDefault();
          const rows = $$(".return-out-row"),
            items = rows.map((r, n) => ({
              item_id: String(n),
              return_quantity: r.querySelector(".ret-q")?.value,
              return_weight: r.querySelector(".ret-w")?.value,
              problem_enabled: r.querySelector(".ret-problem-check").checked,
              problem_note: r.querySelector(".ret-problem-note").value,
              quality_enabled: r.querySelector(".ret-quality-check").checked,
              quality_quantity: r.querySelector(".ret-quality-qty").value,
              return_quality: r.querySelector(".ret-quality").value,
            }));
          try {
            await post("/api/outsourcing/" + f.id + "/return", {
              warehouse_id: new FormData(e.target).get("warehouse_id"),
              notes: new FormData(e.target).get("notes") || "",
              items,
            });
            $("#modal").classList.remove("open");
            toast("Retorno registrado; o estoque será atualizado ao concluir");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
        rows.forEach((r) => {
          const p = r.querySelector(".ret-problem-check"),
            q = r.querySelector(".ret-quality-check"),
            sync = () => {
              r.querySelector(".return-problem-field").style.display = p.checked
                ? "grid"
                : "none";
              r.querySelectorAll(".return-quality-field").forEach(
                (x) => (x.style.display = q.checked ? "grid" : "none"),
              );
            };
          p.onchange = sync;
          q.onchange = sync;
          sync();
        });
      }
      /* Terceirização: quantidade obrigatória e peso opcional, sem modo de contagem. */
      function ptNum(v) {
        return Number(
          String(v ?? "")
            .trim()
            .replace(",", "."),
        );
      }
      function outInputRow(i = {}) {
        return `<div class="out-input-row"><label class="terc-product-label">Produto / descrição<input class="terc-name" list="outsourcingProductOptions" value="${esc(i.product_name || "")}" placeholder="Ex.: Chave de Rosca M" required></label><label class="terc-quantity-field">Quantidade da contagem<input class="terc-q" type="number" min="0" step="0.01" value="${i.quantity ?? ""}" placeholder="Obrigatório" required></label><label class="terc-weight-field">Peso (kg)<input class="terc-w" type="number" min="0" step="0.001" value="${i.weight ?? ""}" placeholder="Opcional"></label><button type="button" class="remove-out-line">×</button></div>`;
      }
      function bindOutRows() {
        document.querySelectorAll(".out-input-row").forEach((row) => {
          row.querySelector(".remove-out-line").onclick = () => {
            if (
              document.querySelectorAll("#outInputLines .out-input-row")
                .length > 1
            )
              row.remove();
          };
        });
      }
      function newOutModal() {
        openModal(
          `<h2>Nova contagem para terceirização</h2><p class="product-meta">Cadastre os itens da família. Eles só entram no estoque comum quando retornarem e o processo for confirmado e concluído; se o produto ainda não existir, ele será criado na categoria Terceirização.</p><form id="outForm" class="modal-form"><datalist id="outsourcingProductOptions">${outProductSuggestions()}</datalist><div id="outInputLines">${outInputRow()}</div><button type="button" class="add-line" id="addOutLine">+ Adicionar produto à família</button><label>Observação da contagem<textarea name="notes" rows="3" placeholder="Ex.: enviado para polimento"></textarea></label><button class="primary">Registrar contagem</button></form>`,
        );
        $("#addOutLine").onclick = () => {
          $("#outInputLines").insertAdjacentHTML("beforeend", outInputRow());
          bindOutRows();
        };
        bindOutRows();
        $("#outForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = [...document.querySelectorAll("#outInputLines .out-input-row")].map((r) => ({
            product_name: r.querySelector(".terc-name").value.trim(),
            quantity: r.querySelector(".terc-q").value,
            weight: r.querySelector(".terc-w").value,
          }));
          try {
            await post("/api/outsourcing", {
              items,
              notes: new FormData(e.target).get("notes"),
            });
            $("#modal").classList.remove("open");
            toast("Contagem registrada");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function outInputRowEdit(i = {}) {
        return outInputRow(i);
      }
      function editOutModal(f) {
        if (!f || f.status !== "counted") return;
        openModal(
          `<h2>Editar contagem da família</h2><p class="product-meta">Ajuste produto, quantidade e peso antes do envio. A quantidade continua obrigatória.</p><form id="editOutForm" class="modal-form"><div id="editOutLines">${(f.items || []).map((i) => outInputRow(i)).join("")}</div><button type="button" class="add-line" id="addEditOutLine">+ Adicionar produto à família</button><label>Observação<textarea name="notes" rows="3">${esc(f.notes || "")}</textarea></label><button class="primary">Salvar alterações</button></form>`,
        );
        $("#addEditOutLine").onclick = () => {
          $("#editOutLines").insertAdjacentHTML("beforeend", outInputRow());
          bindOutRows();
        };
        bindOutRows();
        $("#editOutForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = [...document.querySelectorAll("#editOutLines .out-input-row")].map((r) => ({
            product_name: r.querySelector(".terc-name").value.trim(),
            quantity: r.querySelector(".terc-q").value,
            weight: r.querySelector(".terc-w").value,
          }));
          try {
            await post(
              "/api/outsourcing/" + f.id + "/edit",
              { items, notes: new FormData(e.target).get("notes") },
              "PUT",
            );
            $("#modal").classList.remove("open");
            toast("Contagem atualizada");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function returnOutModal(f) {
        openModal(
          `<h2>Registrar retorno da família</h2><p class="product-meta">Informe o que voltou. Ao concluir, o sistema lançará automaticamente a quantidade no primeiro estoque cadastrado. Em itens por peso, informe o peso retornado e o sistema estima a quantidade.</p><form id="returnOutForm" class="modal-form"><div class="return-out-lines">${(
            f.items || []
          )
            .map((i, n) => {
              const mode =
                i.count_mode === "weight" ||
                (!i.quantity_enabled && i.weight_enabled)
                  ? "weight"
                  : "quantity";
              return `<div class="return-out-row" data-index="${n}" data-mode="${mode}"><strong>${esc(i.product_name)}</strong>${mode === "weight" ? `<label>Peso retornado (kg)<input class="ret-w" type="number" min="0" step="0.001" value="${i.return_weight ?? ""}"></label><label>Peso unitário (kg)<input class="ret-unit-w" type="number" min="0.000001" step="0.000001" value="${i.unit_weight ?? ""}"></label><label>Quantidade estimada<input class="ret-q-est" type="number" readonly></label>` : `<label>Quantidade retornada<input class="ret-q" type="number" min="0" step="1" placeholder="Enviado: ${i.quantity}"></label>`}<label class="return-check"><input type="checkbox" class="ret-problem-check"> Problema com o produto?</label><label class="return-problem-field">Observação do problema<input class="ret-problem-note" placeholder="Descreva o problema"></label><label class="return-check"><input type="checkbox" class="ret-quality-check"> Acabamento e qualidade</label><label class="return-quality-field">Observação específica<input class="ret-quality" placeholder="Opcional"></label></div>`;
            })
            .join(
              "",
            )}</div><label>Observação do retorno<textarea name="notes" rows="3"></textarea></label><button class="primary">Registrar retorno</button></form>`,
        );
        document.querySelectorAll(".return-out-row").forEach((row) => {
          const sync = () => {
            const w = ptNum(row.querySelector(".ret-w")?.value),
              u = ptNum(row.querySelector(".ret-unit-w")?.value),
              q = row.querySelector(".ret-q-est");
            if (q) q.value = u > 0 && w >= 0 ? String(Math.floor(w / u)) : "";
            const p = row.querySelector(".ret-problem-check"),
              qk = row.querySelector(".ret-quality-check");
            row.querySelector(".return-problem-field").style.display = p.checked
              ? "grid"
              : "none";
            row
              .querySelectorAll(".return-quality-field")
              .forEach((x) => (x.style.display = qk.checked ? "grid" : "none"));
          };
          row
            .querySelectorAll(".ret-w,.ret-unit-w")
            .forEach((x) => (x.oninput = sync));
          row.querySelector(".ret-problem-check").onchange = sync;
          row.querySelector(".ret-quality-check").onchange = sync;
          sync();
        });
        $("#returnOutForm").onsubmit = async (e) => {
          e.preventDefault();
          const items = [...document.querySelectorAll(".return-out-row")].map(
            (r) => {
              const mode = r.dataset.mode,
                weight = ptNum(r.querySelector(".ret-w")?.value),
                unit = ptNum(r.querySelector(".ret-unit-w")?.value);
              return {
                count_mode: mode,
                return_quantity:
                  mode === "weight"
                    ? Math.floor(weight / unit)
                    : ptNum(r.querySelector(".ret-q")?.value),
                return_weight: mode === "weight" ? weight : null,
                unit_weight: mode === "weight" ? unit : null,
                problem_enabled: r.querySelector(".ret-problem-check").checked,
                problem_note: r.querySelector(".ret-problem-note").value,
                quality_enabled: r.querySelector(".ret-quality-check").checked,
                return_quality: r.querySelector(".ret-quality").value,
              };
            },
          );
          try {
            await post("/api/outsourcing/" + f.id + "/return", {
              notes: new FormData(e.target).get("notes") || "",
              items,
            });
            $("#modal").classList.remove("open");
            toast("Retorno registrado");
            load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      function outItemText(i, ret = false) {
        const q = ret ? i.return_quantity : i.quantity;
        const w = ret ? i.return_weight : i.weight;
        return `<div class="out-item"><strong>${esc(i.product_name)}</strong><span>Quantidade ${q ?? 0}${w !== null && w !== undefined && w !== "" ? ` · Peso ${w} kg` : ""}</span>${ret && i.return_quality ? `<small>Acabamento: ${esc(i.return_quality)}</small>` : ""}${ret && i.problem_note ? `<small>Problema: ${esc(i.problem_note)}</small>` : ""}</div>`;
      }
      function taskTypeClass(t) {
        return t.category === "outsourcing"
          ? "task-outsourcing"
          : t.category === "dynamic"
            ? "task-dynamic"
            : "task-stock";
      }
      function updateTasksBadge(count) {
        const b = $("#tasksNavBadge");
        if (!b) return;
        b.textContent = String(count);
        b.hidden = !(count > 0);
      }
      function resolveTaskModal(task) {
        openModal(
          `<h2>Resolver task</h2><p class="product-meta"><strong>${esc(task.type)}</strong><br>${esc(task.text)}</p><form id="taskResolveForm" class="task-resolve-modal"><label>O que aconteceu ou como foi resolvido?<textarea name="resolution_note" required placeholder="Descreva a ação tomada, causa encontrada ou observação para o histórico."></textarea></label><button class="primary">Salvar resolução</button></form>`,
        );
        $("#taskResolveForm").onsubmit = async (e) => {
          e.preventDefault();
          const note = String(
            new FormData(e.target).get("resolution_note") || "",
          ).trim();
          if (!note) return toast("Descreva como a task foi resolvida.");
          try {
            const isDynamicTask = String(task.id || "").startsWith("dynamic-task:"), isExpiryTask = task.category === "expiry";
            if (isExpiryTask) {
              await post("/api/expiry/resolve", { lot_id: task.resolve, note });
            } else if (isDynamicTask) {
              await post("/api/dynamic-tasks/" + task.resolve, { resolution_note: note });
            } else {
              await post("/api/outsourcing/warnings/" + task.resolve + "/resolve", { resolution_note: note });
            }
            $("#modal").classList.remove("open");
            toast(isExpiryTask ? "Alerta de validade resolvido" : isDynamicTask ? "Task resolvida; componente lançado no estoque" : "Task resolvida e registrada no histórico");
            await load();
          } catch (x) {
            toast(x.message);
          }
        };
      }
      // Controle de validade (v2): painel com alertas, prazos, FEFO, estoque baixo e produtos. Só leitura dos dados já existentes.
      let vxTab = "lots";
      function renderExpiryControl() {
        const list = $("#expiryList"), summary = $("#expirySummary");
        if (!list || !summary) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const fq = (n) => Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
        const fd = (v) => new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR");
        const q = ($("#vxSearch")?.value || "").trim().toLowerCase(), filter = $("#expiryFilter")?.value || "attention";
        const catName = (p) => (D.categories || []).find((c) => c.id === p.category_id)?.name || "Sem categoria";
        const lots = (D.expiryLots || []).map((lot) => {
          const product = (D.products || []).find((p) => p.id === lot.product_id), date = new Date(`${lot.expiry_date}T00:00:00`);
          if (!product || Number.isNaN(date.getTime())) return null;
          const days = Math.ceil((date - today) / 86400000), alertDays = Number(product.expiry_alert_days ?? 30), left = Number(lot.quantity || 0);
          if (!lot.resolved && left <= 0) return null;
          const status = lot.resolved ? "done" : days < 0 ? "exp" : days <= alertDays ? "warn" : "ok";
          return { lot, product, days, alertDays, status, left };
        }).filter(Boolean);
        const act = lots.filter((r) => !r.lot.resolved), sum = (rs) => rs.reduce((s, r) => s + r.left, 0);
        const exp = act.filter((r) => r.days < 0), w7 = act.filter((r) => r.days >= 0 && r.days <= 7), w30 = act.filter((r) => r.days >= 0 && r.days <= 30);
        const low = (D.products || []).filter((p) => Number(p.min || 0) > 0 && qty(p.id) < Number(p.min)).sort((a, b) => qty(a.id) / a.min - qty(b.id) / b.min);
        const attention = act.filter((r) => r.status !== "ok");
        const banner = $("#vxBanner");
        banner.innerHTML = exp.length || low.length
          ? `<div class="vx-banner"><div><b>${exp.length ? `${exp.length} lote(s) vencido(s) precisam sair do estoque` : `${low.length} produto(s) abaixo do mínimo`}</b><span>${exp.length ? `${esc(fq(sum(exp)))} itens vencidos. ` : ""}${low.length ? `${low.length} produto(s) com estoque abaixo do mínimo.` : ""}</span></div><button type="button" class="primary" id="vxGo">Ver o que fazer agora</button></div>`
          : `<div class="vx-banner vx-ok"><div><b>Tudo em dia</b><span>Nenhum lote vencido e nenhum produto abaixo do mínimo.</span></div></div>`;
        $("#vxGo")?.addEventListener("click", () => { vxTab = exp.length ? "lots" : "low"; if ($("#expiryFilter") && exp.length) $("#expiryFilter").value = "expired"; renderExpiryControl(); $("#vxTabs")?.scrollIntoView({ behavior: "smooth" }); });
        const withExpiry = (D.products || []).filter((p) => p.uses_expiry === true).length;
        summary.innerHTML = [["alert", "Vencidos", exp.length, `${fq(sum(exp))} itens`], ["stock", "Vencem em 7 dias", w7.length, `${fq(sum(w7))} itens`], ["stock", "Vencem em 30 dias", w30.length, `${fq(sum(w30))} itens`], ["dynamic", "Estoque baixo", low.length, "abaixo do mínimo"], ["info", "Produtos cadastrados", (D.products || []).length, `${withExpiry} com controle de validade`]]
          .map((k) => `<div class="tasks-kpi ${k[0]}"><small>${k[1]}</small><strong>${k[2]}</strong><small>${k[3]}</small></div>`).join("");
        const bands = [["Vencidos", (r) => r.days < 0, "#f8061b"], ["0 a 7 dias", (r) => r.days >= 0 && r.days <= 7, "#e0562b"], ["8 a 30 dias", (r) => r.days > 7 && r.days <= 30, "#ec9b17"], ["31 a 90 dias", (r) => r.days > 30 && r.days <= 90, "#2f78d0"], ["Mais de 90 dias", (r) => r.days > 90, "#23936b"]];
        const peak = Math.max(1, ...bands.map((b) => sum(act.filter(b[1]))));
        $("#vxBars").innerHTML = act.length ? bands.map((b) => { const g = act.filter(b[1]); return `<div class="vx-bar"><span>${b[0]}</span><div class="vx-track"><div class="vx-fill" style="width:${(sum(g) / peak) * 100}%;background:${b[2]}"></div></div><span>${esc(fq(sum(g)))} · ${g.length} lote(s)</span></div>`; }).join("") : '<div class="empty">Nenhum lote com saldo registrado.</div>';
        const fefo = act.filter((r) => r.days >= 0).sort((a, b) => a.days - b.days).slice(0, 5);
        $("#vxFefo").innerHTML = fefo.length ? fefo.map((r, i) => `<div class="vx-fefo"><span class="vx-rank">${i + 1}</span><div><b>${esc(r.product.name)}</b><small>${esc(fq(r.left))} ${esc(r.product.unit || "UN")} em ${esc(wName(r.lot.warehouse_id))} · vence ${fd(r.lot.expiry_date)}</small></div><span class="vx-chip ${r.days <= 7 ? "r" : "a"}">${r.days === 0 ? "hoje" : r.days + " d"}</span></div>`).join("") : '<div class="empty">Sem lotes a vencer.</div>';
        const tabs = [["lots", "Lotes", attention.length], ["low", "Estoque baixo", low.length], ["prod", "Produtos cadastrados", (D.products || []).length]];
        $("#vxTabs").innerHTML = tabs.map((t) => `<button type="button" class="vx-tab" role="tab" aria-selected="${vxTab === t[0]}" data-tab="${t[0]}">${t[1]}<i>${t[2]}</i></button>`).join("");
        $$("#vxTabs .vx-tab").forEach((b) => b.onclick = () => { vxTab = b.dataset.tab; renderExpiryControl(); });
        $("#vxFilterBox").style.display = vxTab === "lots" ? "" : "none";
        $("#vxSearch").style.display = vxTab === "low" ? "none" : "";
        const hit = (s) => !q || s.toLowerCase().includes(q);
        if (vxTab === "lots") {
          const rows = lots.filter((r) => filter === "all" ? true : filter === "resolved" ? r.lot.resolved : filter === "expired" ? r.status === "exp" : r.status === "exp" || r.status === "warn").filter((r) => hit(`${r.product.name} ${r.product.sku || ""} ${r.lot.id}`)).sort((a, b) => a.days - b.days);
          list.innerHTML = '<p class="product-meta vx-note">Quando uma saída zera o lote, o alerta some sozinho. “Resolvido” serve para casos como descarte, em que o saldo continua registrado.</p>' + (rows.length ? rows.map(({ lot, product, days, alertDays, status, left }) => {
            const pc = status === "exp" ? 100 : Math.min(100, Math.max(4, 100 - (days / Math.max(alertDays * 3, 1)) * 100)), col = status === "exp" ? "#f8061b" : status === "warn" ? "#ec9b17" : "#23936b";
            return `<article class="vx-card vx-${status}"><div><p class="addon-kicker">${{ exp: "VENCIDO", warn: "PRÓXIMO DO VENCIMENTO", ok: "DENTRO DO PRAZO", done: "RESOLVIDO" }[status]}</p><h4>${esc(product.name)}</h4><p>${esc(product.sku || "Sem SKU")} · ${esc(wName(lot.warehouse_id))} · ${esc(fq(left))} ${esc(product.unit || "UN")}</p><p>Validade: <b>${fd(lot.expiry_date)}</b> · Aviso: ${alertDays} dias · ${esc(lot.id)}</p><div class="vx-life"><i style="width:${pc}%;background:${col}"></i></div></div><div class="vx-act"><div class="vx-days"><b>${days < 0 ? "-" + Math.abs(days) : days}</b><small>${days < 0 ? "dias vencido" : days === 0 ? "vence hoje" : "dias restantes"}</small></div>${!lot.resolved ? `<button type="button" class="task-resolve expiry-resolve" data-lot="${esc(lot.id)}">Resolvido</button>` : ""}</div></article>`;
          }).join("") : '<div class="empty">Nenhum lote encontrado nesta visão.</div>');
          list.querySelectorAll(".expiry-resolve").forEach((button) => button.onclick = () => resolveTaskModal({ category: "expiry", id: "expiry:" + button.dataset.lot, resolve: button.dataset.lot, type: "Alerta de validade", text: "Confirme a resolução deste alerta de validade." }));
        } else if (vxTab === "low") {
          list.innerHTML = low.length ? low.map((p) => {
            const s = qty(p.id), mx = Math.max(Number(p.max || 0), Number(p.min)), pc = Math.max(0, Math.min(100, (s / mx) * 100)), crit = s < Number(p.min) * 0.5, buy = Math.max(0, mx - s);
            return `<div class="vx-row"><div><b>${esc(p.name)}</b><small>${esc(p.sku || "Sem SKU")} · ${esc(catName(p))}</small></div><div><div class="vx-gauge"><i style="width:${pc}%;background:${crit ? "#f8061b" : "#ec9b17"}"></i><u style="left:${(Number(p.min) / mx) * 100}%" title="Mínimo"></u></div><div class="vx-gl"><span>Atual: ${esc(fq(s))} ${esc(p.unit || "UN")}</span><span>Mínimo ${esc(fq(p.min))} · Máximo ${esc(fq(p.max || 0))}</span></div></div><div><span class="vx-chip ${crit ? "r" : "a"}">${s <= 0 ? "Sem estoque" : crit ? "Crítico" : "Abaixo do mínimo"}</span><small>Para chegar ao máximo: <b>${esc(fq(buy))} ${esc(p.unit || "UN")}</b></small></div></div>`;
          }).join("") : '<div class="empty">Nenhum produto abaixo do mínimo.</div>';
        } else {
          const prods = (D.products || []).filter((p) => hit(`${p.name} ${p.sku || ""} ${catName(p)}`));
          list.innerHTML = prods.length ? `<div class="vx-wrap"><table class="vx-table"><thead><tr><th>Produto</th><th>SKU</th><th>Categoria</th><th>Estoque</th><th>Mín.</th><th>Validade</th><th>Próximo vencimento</th><th>Situação</th></tr></thead><tbody>${prods.map((p) => {
            const s = qty(p.id), mine = act.filter((r) => r.product.id === p.id), next = mine.filter((r) => r.days >= 0).sort((a, b) => a.days - b.days)[0];
            const sit = mine.some((r) => r.days < 0) ? '<span class="vx-chip r">Lote vencido</span>' : s <= 0 && Number(p.min || 0) > 0 ? '<span class="vx-chip r">Sem estoque</span>' : Number(p.min || 0) > 0 && s < Number(p.min) ? '<span class="vx-chip a">Estoque baixo</span>' : '<span class="vx-chip g">OK</span>';
            return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.sku || "—")}</td><td>${esc(catName(p))}</td><td>${esc(fq(s))} ${esc(p.unit || "UN")}</td><td>${esc(fq(p.min || 0))}</td><td>${p.uses_expiry ? `Aviso ${Number(p.expiry_alert_days ?? 30)} d` : '<span class="vx-chip m">Sem controle</span>'}</td><td>${next ? `${fd(next.lot.expiry_date)} (${next.days} d)` : "—"}</td><td>${sit}</td></tr>`;
          }).join("")}</tbody></table></div>` : '<div class="empty">Nenhum produto encontrado.</div>';
        }
      }
      function renderTasks() {
        const list = $("#tasksList"),
          summary = $("#tasksSummary");
        if (!list) return;
        const tasks = [];
        const add = (x) =>
          tasks.push({ ...x, category: x.category || "stock" });
        const expiryNow = new Date(); expiryNow.setHours(0, 0, 0, 0);
        for (const lot of D.expiryLots || []) {
          if (lot.resolved || !(Number(lot.quantity || 0) > 0)) continue;
          const product = (D.products || []).find((p) => p.id === lot.product_id), expiry = new Date(`${lot.expiry_date}T00:00:00`);
          if (!product || Number.isNaN(expiry.getTime())) continue;
          const days = Math.ceil((expiry - expiryNow) / 86400000), alertDays = Number(product.expiry_alert_days ?? 30);
          if (days <= alertDays) add({ id: "expiry:" + lot.id, type: days < 0 ? "Produto vencido" : "Produto vencendo", text: `${product.name}: validade em ${new Date(`${lot.expiry_date}T00:00:00`).toLocaleDateString("pt-BR")} (${days < 0 ? `vencido há ${Math.abs(days)} dia(s)` : `faltam ${days} dia(s)`}).`, category: "expiry", resolve: lot.id, view: "expiry-control", context: ["Lote: " + lot.id, wName(lot.warehouse_id), "Aviso configurado: " + alertDays + " dias"] });
        }
        for (const task of D.dynamicTasks || []) if (!task.resolved) add({ id: "dynamic-task:" + task.id, type: task.type || "Componente faltante", text: task.text, category: "dynamic", resolve: task.id, view: "dashboard", context: [task.product_name || "Produto dinâmico", task.purchase_id ? "Compra/lote: " + task.purchase_id : "Entrada registrada"] });
        for (const f of D.outsourcing || []) {
          const statusText = {
            counted: "Contagem concluída; falta enviar para terceirização.",
            sent: "Material enviado; falta registrar o retorno.",
            returned:
              "Retorno registrado; falta confirmar e lançar no estoque.",
          };
          if (statusText[f.status])
            add({
              id: "status:" + f.id,
              type: "Terceirização · próxima etapa",
              text: `${f.id}: ${statusText[f.status]}`,
              category: "outsourcing",
              view: "outsourcing",
              context: ["Família " + f.id, "Status: " + outStatus(f.status)],
            });
          for (const w of f.warnings || [])
            if (!w.resolved) {
              const item =
                  (f.items || []).find(
                    (i) => i.product_name === w.item_product_name,
                  ) || {},
                sent = Number(w.sent),
                returned = Number(w.returned),
                hasNumbers =
                  w.sent !== null &&
                  w.sent !== undefined &&
                  w.returned !== null &&
                  w.returned !== undefined &&
                  Number.isFinite(sent) &&
                  Number.isFinite(returned),
                unit = w.field === "weight" ? "kg" : item.unit || "un.",
                gap = hasNumbers ? sent - returned : null,
                quantityDetail = hasNumbers
                  ? `${gap >= 0 ? "Faltaram" : "Excederam"}: ${Math.abs(gap)} ${unit} · Enviado: ${sent} ${unit} · Retornado: ${returned} ${unit}`
                  : "",
                warningContext = [
                  "Família " + f.id,
                  "Criada: " + outDate(w.created_at),
                ];
              if (quantityDetail) warningContext.push(quantityDetail);
              add({
                id: "warning:" + w.id,
                type: "Terceirização · divergência",
                text: `${w.item_product_name}: ${w.message}`,
                category: "outsourcing",
                resolve: w.id,
                context: warningContext,
                quantityDetail,
              });
            }
          if (f.status === "confirmed" && !f.stock_posted_at)
            add({
              id: "stock:" + f.id,
              type: "Terceirização · retorno sem lançamento",
              text: `A família ${f.id} foi concluída, mas o retorno ainda não foi lançado no estoque.`,
              category: "outsourcing",
              view: "outsourcing",
              context: [
                "Família " + f.id,
                "Concluída: " + outDate(f.confirmed_at),
              ],
            });
        }
        const wid = $("#globalWarehouse")?.value || "all";
        for (const p of D.products || []) {
          const total = qty(p.id, wid);
          if (Number(p.min || 0) > 0 && total < Number(p.min || 0))
            add({
              id: "low:" + p.id,
              type: "Estoque baixo",
              text: `${p.name}: ${total} ${p.unit || "UN"} (mínimo ${p.min}).`,
              category: "stock",
              view: "dashboard",
              context: [
                "SKU " + (p.sku || "—"),
                wid === "all" ? "Todos os estoques" : wName(wid),
              ],
            });
        }
        for (const p of D.dynamicProducts || []) {
          const total = unifiedQty(
            { catalogType: "dynamic", nodes: p.nodes || [] },
            wid,
          );
          if (Number(p.min || 0) > 0 && total < Number(p.min || 0))
            add({
              id: "dynlow:" + p.id,
              type: "Produto dinâmico · estoque baixo",
              text: `${p.name}: ${total} ${p.unit || "UN"} (mínimo ${p.min}).`,
              category: "dynamic",
              view: "dynamic-products",
              context: [
                "Composição dinâmica",
                wid === "all" ? "Todos os estoques" : wName(wid),
              ],
            });
        }
        const query = ($("#tasksSearch")?.value || "").toLowerCase().trim(),
          type = $("#tasksTypeFilter")?.value || "",
          visible = tasks.filter(
            (t) =>
              (!type || t.category === type) &&
              (!query ||
                `${t.type} ${t.text} ${(t.context || []).join(" ")}`
                  .toLowerCase()
                  .includes(query)),
          );
        const counts = {
          all: tasks.length,
          outsourcing: tasks.filter((t) => t.category === "outsourcing").length,
          stock: tasks.filter((t) => t.category === "stock").length,
          dynamic: tasks.filter((t) => t.category === "dynamic").length,
          expiry: tasks.filter((t) => t.category === "expiry").length,
        };
        updateTasksBadge(counts.all);
        summary.innerHTML = `<div class="tasks-kpi alert"><small>Pendências</small><strong>${counts.all}</strong><small>Itens que precisam de atenção</small></div><div class="tasks-kpi info"><small>Terceirização</small><strong>${counts.outsourcing}</strong><small>Acontecimentos e divergências</small></div><div class="tasks-kpi stock"><small>Estoque</small><strong>${counts.stock}</strong><small>Produtos abaixo do mínimo</small></div><div class="tasks-kpi dynamic"><small>Dinâmicos</small><strong>${counts.dynamic}</strong><small>Componentes com alerta</small></div><div class="tasks-kpi expiry"><small>Validade</small><strong>${counts.expiry}</strong><small>Vencidos ou próximos</small></div>`;
        list.innerHTML = visible.length
          ? visible
              .map(
                (t) =>
                  `<div class="task-row ${taskTypeClass(t)}"><div><strong>${esc(t.type)}</strong><p>${esc(t.text)}</p>${t.quantityDetail ? `<div class="task-quantity-detail"><strong>${esc(t.quantityDetail)}</strong></div>` : ""}<div class="task-context">${(
                    t.context || []
                  )
                    .filter((c) => c !== t.quantityDetail)
                    .map((c) => `<span>${esc(c)}</span>`)
                    .join(
                      "",
                    )}</div></div><div class="task-actions">${t.resolve ? `<button class="task-resolve" data-task="${esc(t.resolve)}">Resolver</button>` : ""}${t.view ? `<button class="task-open" data-view="${esc(t.view)}">Abrir</button>` : ""}</div></div>`,
              )
              .join("")
          : tasks.length
            ? `<div class="empty">Nenhuma task corresponde aos filtros.</div>`
            : `<div class="empty">Nenhuma task pendente.</div>`;
        list.querySelectorAll(".task-resolve").forEach(
          (b) =>
            (b.onclick = () => {
              const t = tasks.find((x) => x.resolve === b.dataset.task);
              if (t) resolveTaskModal(t);
            }),
        );
        list.querySelectorAll(".task-open").forEach(
          (b) =>
            (b.onclick = () => {
              document
                .querySelectorAll(".view")
                .forEach((v) =>
                  v.classList.toggle("active", v.id === b.dataset.view),
                );
              document
                .querySelectorAll("nav button")
                .forEach((n) =>
                  n.classList.toggle(
                    "active",
                    n.dataset.view === b.dataset.view,
                  ),
                );
            }),
        );
      }
      $("#tasksSearch")?.addEventListener("input", renderTasks);
      $("#tasksTypeFilter")?.addEventListener("change", renderTasks);
      $("#tasksRefresh")?.addEventListener("click", load);
      $("#expiryFilter")?.addEventListener("change", renderExpiryControl);
      $("#vxSearch")?.addEventListener("input", renderExpiryControl);
      $("#expiryRefresh")?.addEventListener("click", load);
      $("#globalWarehouse")?.addEventListener("change", () => {
        if (typeof renderTasks === "function") renderTasks();
      });
      function closeMobileMenu() {
        document.body.classList.remove("mobile-menu-open");
        const b = $("#mobileMenuToggle"),
          s = $(".sidebar"),
          back = $("#mobileMenuBackdrop");
        if (b) b.setAttribute("aria-expanded", "false");
        if (s) s.classList.remove("mobile-open");
        if (back) back.hidden = true;
      }
      function toggleMobileMenu() {
        const b = $("#mobileMenuToggle"),
          s = $(".sidebar"),
          back = $("#mobileMenuBackdrop"),
          open = !s?.classList.contains("mobile-open");
        if (!s) return;
        s.classList.toggle("mobile-open", open);
        document.body.classList.toggle("mobile-menu-open", open);
        if (b) b.setAttribute("aria-expanded", String(open));
        if (back) back.hidden = !open;
      }
      $("#mobileMenuToggle")?.addEventListener("click", toggleMobileMenu);
      $("#mobileMenuBackdrop")?.addEventListener("click", closeMobileMenu);
      $(".sidebar nav")?.addEventListener("click", (e) => {
        if (e.target.closest("button")) closeMobileMenu();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMobileMenu();
      });

// =====================================================================
// AJUSTES DE USO: validade na transferência, rolagem do mouse e fórmulas
// =====================================================================
(function () {
  // ---------- 1) Rolar o mouse não muda o valor de campos numéricos ----------
  document.addEventListener("wheel", (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === "number" && document.activeElement === t) t.blur();
  }, { passive: true });

  // ---------- 2) Fórmulas estilo Excel nos campos numéricos (ex.: =48+5+(5*8)) ----------
  // Só em computador (mouse). No celular o teclado numérico não tem os sinais; lá o campo segue normal.
  const fineMouse = !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);
  const isPlain = (v) => /^-?\d*[.,]?\d*$/.test(v);
  const isFormula = (v) => /^\s*=/.test(v) || /[+*\/()×÷]/.test(v) || /\d\s*-\s*[\d(]/.test(v) || /\dx\d/i.test(v);
  function calc(expr) {
    const s = String(expr).replace(/^\s*=/, "").replace(/\s+/g, "").replace(/,/g, ".").replace(/[x×]/gi, "*").replace(/÷/g, "/");
    if (!s || /[^0-9+\-*/().]/.test(s)) return null;
    let i = 0;
    const fail = () => { throw new Error("fórmula"); };
    function num() {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) fail();
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function factor() {
      const c = s[i];
      if (c === "-") { i++; return -factor(); }
      if (c === "+") { i++; return factor(); }
      if (c === "(") { i++; const v = sum(); if (s[i] !== ")") fail(); i++; return v; }
      return num();
    }
    function term() {
      let v = factor();
      while (s[i] === "*" || s[i] === "/") { const op = s[i++]; const r = factor(); v = op === "*" ? v * r : v / r; }
      return v;
    }
    function sum() {
      let v = term();
      while (s[i] === "+" || s[i] === "-") { const op = s[i++]; const r = term(); v = op === "+" ? v + r : v - r; }
      return v;
    }
    try {
      const v = sum();
      if (i !== s.length || !Number.isFinite(v)) return null;
      return Math.round(v * 1e6) / 1e6;
    } catch { return null; }
  }
  function settle(t) {
    const raw = String(t.value || "").trim();
    if (raw === "") return;
    let val = null;
    if (isFormula(raw)) val = calc(raw);
    else if (isPlain(raw) && raw !== "-" && raw !== "." && raw !== "-.") val = Number(raw.replace(",", "."));
    if (val === null || !Number.isFinite(val)) {
      t.value = t.dataset.fxPrev || "";
      if (typeof toast === "function") toast("Fórmula ou número inválido. Mantive o valor anterior.");
    } else t.value = String(val);
  }
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!fineMouse || !(t instanceof HTMLInputElement) || t.type !== "number" || t.readOnly || t.disabled) return;
    t.dataset.fx = "1";
    t.dataset.fxPrev = t.value;
    t.type = "text";
    t.inputMode = "decimal";
    try { const n = t.value.length; t.setSelectionRange(0, n); } catch (_) {}
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.dataset.fx !== "1") return;
    settle(t);
    t.type = "number";
    delete t.dataset.fx;
  });
  // Antes de qualquer outro código ler o valor: resolve a fórmula ao confirmar (Tab, clique fora ou Enter).
  document.addEventListener("change", (e) => { const t = e.target; if (t instanceof HTMLInputElement && t.dataset.fx === "1") settle(t); }, true);
  document.addEventListener("keydown", (e) => { const t = e.target; if (e.key === "Enter" && t instanceof HTMLInputElement && t.dataset.fx === "1") settle(t); }, true);
  // Enquanto a fórmula está sendo digitada, os outros códigos da tela não precisam ver texto incompleto.
  document.addEventListener("input", (e) => { const t = e.target; if (t instanceof HTMLInputElement && t.dataset.fx === "1" && !isPlain(t.value)) e.stopPropagation(); }, true);

  // ---------- 3) Transferência: mostra de qual lote/validade vai sair e para qual estoque ----------
  const style = document.createElement("style");
  style.textContent = ".lots-hint{grid-column:1/-1;font-size:12.5px;line-height:1.45;color:#4b5563;background:#f1f4f9;border-radius:8px;padding:6px 10px}.lots-hint strong{color:#22273f}.lots-hint.warn{background:#fff6e5;color:#8a5200}.expiry-days-off{display:none!important}";
  document.head.appendChild(style);
  const fmtDate = (v) => new Date(v + "T00:00:00").toLocaleDateString("pt-BR");
  function refreshTransferHints() {
    const rows = document.querySelectorAll("#transferLines .operation-line");
    rows.forEach((row) => {
      let hint = row.querySelector(".lots-hint");
      if (!hint) { hint = document.createElement("div"); hint.className = "lots-hint"; hint.style.display = "none"; row.appendChild(hint); }
      hint.style.display = "none"; hint.classList.remove("warn"); hint.innerHTML = "";
      if (typeof add11IsEnabled !== "function" || !add11IsEnabled("expiry-control")) return;
      const product = pBy(row.querySelector(".productInput")?.value || "");
      const selects = row.querySelectorAll(".warehouseSelect");
      const from = selects[0]?.value, to = selects[1]?.value;
      const qty = Number(row.querySelector(".lineQty")?.value);
      if (!product || !from || !(qty > 0)) return;
      const lots = (D.expiryLots || []).filter((l) => l.product_id === product.id && l.warehouse_id === from && !l.resolved && Number(l.quantity) > 0).sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
      if (product.uses_expiry !== true) return;
      let remaining = qty; const parts = [];
      for (const lot of lots) { if (remaining <= 0) break; const used = Math.min(remaining, Number(lot.quantity)); parts.push(`<strong>${esc(String(used))}</strong> com validade <strong>${esc(fmtDate(lot.expiry_date))}</strong>`); remaining -= used; }
      const dest = to && to !== from ? ` para <strong>${esc(wName(to))}</strong>` : "";
      let html = parts.length ? `Vai sair de <strong>${esc(wName(from))}</strong> (os que vencem primeiro): ${parts.join(" · ")}${dest}.` : `Nenhum lote com validade em <strong>${esc(wName(from))}</strong>.`;
      if (remaining > 1e-9) { html += ` ${esc(String(remaining))} sem validade registrada.`; hint.classList.add("warn"); }
      hint.innerHTML = html; hint.style.display = "";
    });
  }
  let hintTimer = null;
  const scheduleHints = () => { clearTimeout(hintTimer); hintTimer = setTimeout(refreshTransferHints, 60); };
  ["input", "change", "click", "focusin"].forEach((ev) => document.addEventListener(ev, (e) => {
    const t = e.target;
    if (t && t.closest && (t.closest("#transferForm") || t.closest('[data-view="transfer"]') || t.closest(".add-line"))) scheduleHints();
  }, true));
  // Só observa as linhas da transferência (sem subárvore): colocar a dica dentro da linha não dispara de novo.
  const transferLinesBox = document.getElementById("transferLines");
  if (transferLinesBox) new MutationObserver(scheduleHints).observe(transferLinesBox, { childList: true });

  // ---------- 4) Validade por produto ----------
  // Caixinha "Produto com validade": mostra/esconde os dias de aviso dentro do modal do produto.
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.name === "uses_expiry") t.closest("form")?.querySelector(".expiry-days")?.classList.toggle("expiry-days-off", !t.checked);
  });
  const expiryOn = () => typeof add11IsEnabled === "function" && add11IsEnabled("expiry-control");
  // Entrada (várias linhas): o campo de data só aparece, e é obrigatório, para produto marcado "com validade".
  function refreshEntryValidity() {
    const on = expiryOn();
    document.querySelectorAll("#entryLines .operation-line").forEach((row) => {
      const input = row.querySelector(".lineExpiry");
      if (!input) return;
      const p = pBy(row.querySelector(".productInput")?.value || "");
      const show = on && !!p && p.uses_expiry === true;
      input.style.display = on ? "" : "none";
      input.style.visibility = show ? "visible" : "hidden";
      input.required = show;
      if (!show && input.value) input.value = "";
    });
  }
  // Registrar entrada dentro do produto: idem.
  function refreshProductEntryValidity() {
    const label = document.querySelector("#productEntryForm .product-entry-validity");
    if (!label) return;
    const p = typeof detailProduct === "function" ? detailProduct() : null;
    const input = label.querySelector("input");
    const show = expiryOn() && !!p && p.uses_expiry === true;
    label.style.display = show ? "" : "none";
    if (input) { input.required = show; if (!show && input.value) input.value = ""; }
  }
  setInterval(() => { try { refreshEntryValidity(); refreshProductEntryValidity(); } catch (_) {} }, 350);
})();
