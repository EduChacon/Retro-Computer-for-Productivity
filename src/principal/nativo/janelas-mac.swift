// Controle de janelas pela API pública de Acessibilidade. Não captura tela nem injeta código.
import Cocoa
import ApplicationServices

struct Falha: Error { let codigo: String }
var janelas: [String: AXUIElement] = [:]
var processos: [String: pid_t] = [:]
func atributo(_ el: AXUIElement, _ nome: String) -> CFTypeRef? {
    var valor: CFTypeRef?
    return AXUIElementCopyAttributeValue(el, nome as CFString, &valor) == .success ? valor : nil
}
func obter(_ id: String) throws -> AXUIElement {
    guard let el = janelas[id], let pid = processos[id], NSRunningApplication(processIdentifier: pid) != nil,
          atributo(el, kAXRoleAttribute) != nil else { throw Falha(codigo: "sessao") }
    return el
}
func definir(_ el: AXUIElement, _ nome: String, _ valor: CFTypeRef) throws {
    guard AXUIElementSetAttributeValue(el, nome as CFString, valor) == .success else { throw Falha(codigo: "incompativel") }
}
func executar(_ r: [String: Any]) throws -> Any {
    let acao = r["acao"] as? String ?? ""
    if acao == "estado" { return ["permitido": AXIsProcessTrusted()] }
    if acao == "permitir" {
        let opcoes = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        return ["permitido": AXIsProcessTrustedWithOptions(opcoes)]
    }
    guard AXIsProcessTrusted() else { throw Falha(codigo: "permissao") }
    if acao == "listar" {
        let arquivo = URL(fileURLWithPath: r["arquivo"] as? String ?? "").standardizedFileURL.resolvingSymlinksInPath()
        var lista: [[String: String]] = []
        for app in NSWorkspace.shared.runningApplications where app.bundleURL?.standardizedFileURL.resolvingSymlinksInPath() == arquivo {
            let ax = AXUIElementCreateApplication(app.processIdentifier)
            AXUIElementSetMessagingTimeout(ax, 2)
            let todas = atributo(ax, kAXWindowsAttribute) as? [AXUIElement] ?? []
            for el in todas.prefix(50) {
                guard atributo(el, kAXSubroleAttribute) as? String == kAXStandardWindowSubrole else { continue }
                let existente = janelas.first { CFEqual($0.value, el) }?.key
                let id = existente ?? UUID().uuidString
                janelas[id] = el; processos[id] = app.processIdentifier
                lista.append(["id": id, "titulo": atributo(el, kAXTitleAttribute) as? String ?? app.localizedName ?? ""])
            }
        }
        return lista
    }
    let id = r["janela"] as? String ?? ""
    if acao == "consultar" { return ["aberta": (try? obter(id)) != nil] }
    if acao == "soltar" { janelas.removeValue(forKey: id); processos.removeValue(forKey: id); return ["ok": true] }
    let el = try obter(id)
    switch acao {
    case "associar": break // No Mac a janela mantém a moldura do próprio aplicativo.
    case "focar":
        try definir(el, kAXMinimizedAttribute, kCFBooleanFalse)
        if let pid = processos[id] { NSRunningApplication(processIdentifier: pid)?.activate(options: [.activateIgnoringOtherApps]) }
        guard AXUIElementPerformAction(el, kAXRaiseAction as CFString) == .success else { throw Falha(codigo: "incompativel") }
    case "minimizar": try definir(el, kAXMinimizedAttribute, kCFBooleanTrue)
    case "fechar":
        guard let botao = atributo(el, kAXCloseButtonAttribute), CFGetTypeID(botao) == AXUIElementGetTypeID(),
              AXUIElementPerformAction(unsafeBitCast(botao, to: AXUIElement.self), kAXPressAction as CFString) == .success else { throw Falha(codigo: "incompativel") }
    case "organizar":
        guard let ret = r["ret"] as? [String: Double], let x = ret["x"], let y = ret["y"], let w = ret["w"], let h = ret["h"],
              [x,y,w,h].allSatisfy({ $0.isFinite }), w > 0, h > 0 else { throw Falha(codigo: "programa") }
        var p = CGPoint(x: x, y: y); var tamanho = CGSize(width: w, height: h)
        try definir(el, kAXMinimizedAttribute, kCFBooleanFalse)
        guard let posicao = AXValueCreate(.cgPoint, &p), let medidas = AXValueCreate(.cgSize, &tamanho) else { throw Falha(codigo: "incompativel") }
        try definir(el, kAXPositionAttribute, posicao); try definir(el, kAXSizeAttribute, medidas)
    default: throw Falha(codigo: "programa")
    }
    return ["ok": true]
}
while let linha = readLine() {
    autoreleasepool {
        var id: Any = NSNull()
        var resposta: [String: Any]
        do {
            guard linha.utf8.count <= 65536, let data = linha.data(using: .utf8), let r = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw Falha(codigo: "programa") }
            id = r["id"] ?? NSNull(); resposta = ["id": id, "dados": try executar(r)]
        } catch { resposta = ["id": id, "erro": (error as? Falha)?.codigo ?? "auxiliar"] }
        if let data = try? JSONSerialization.data(withJSONObject: resposta, options: [.sortedKeys]), let texto = String(data: data, encoding: .utf8) {
            print(texto); fflush(stdout)
        }
    }
}
