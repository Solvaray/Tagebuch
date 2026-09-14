#!/usr/bin/env python3
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import subprocess
import os
import sys
import threading

TEST_FILE = os.path.join('test', 'rechnen.test.js')


def run_tests(cwd):
    """Rechentests laufen lassen.

    (True, ausgabe)  bestanden
    (False, ausgabe) durchgefallen - dann wird nicht deployt
    (None, grund)    liessen sich nicht ausfuehren

    Warum das vor dem Push gehoert: die App rechnet Dosiswerte. Ein Fehler
    darin ist auf dem Handy nicht zu erkennen - dort steht dann einfach
    eine falsche Zahl.
    """
    import os.path
    if not os.path.exists(os.path.join(cwd, TEST_FILE)):
        return None, TEST_FILE + " ist nicht da."
    try:
        r = subprocess.run(['node', TEST_FILE], cwd=cwd,
                           capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        return None, "Node.js ist nicht installiert oder nicht im PATH."
    except subprocess.TimeoutExpired:
        return False, "Die Tests sind in ein Timeout gelaufen."
    ausgabe = ((r.stdout or '') + (r.stderr or '')).strip()
    return (r.returncode == 0), ausgabe


class DeployApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Tagebuch Deploy")
        self.root.geometry("420x380")
        self.root.resizable(False, False)
        
        bg = "#14161a"
        fg = "#e8e6e1"
        accent = "#7c9885"
        surface = "#1b1e23"
        
        self.root.configure(bg=bg)
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TLabel', background=bg, foreground=fg)
        style.configure('TEntry', fieldbackground=surface, foreground=fg)
        style.map('TEntry', fieldbackground=[('focus', surface)])
        style.configure('TButton', background=accent, foreground="#0f1210")
        style.map('TButton', background=[('active', accent)])
        
        # Title
        title = tk.Label(root, text="Tagebuch → GitHub", font=("Arial", 18, "bold"), bg=bg, fg=fg)
        title.pack(pady=16)
        
        # Form
        frame = tk.Frame(root, bg=bg)
        frame.pack(padx=20, pady=10, fill="both", expand=True)
        
        tk.Label(frame, text="GitHub-Nutzername:", bg=bg, fg=fg, font=("Arial", 10)).pack(anchor="w", pady=(6,2))
        self.username_entry = tk.Entry(frame, width=40, bg=surface, fg=fg, insertbackground=fg)
        self.username_entry.pack(anchor="w", pady=(0,12))
        
        tk.Label(frame, text="GitHub Token:", bg=bg, fg=fg, font=("Arial", 10)).pack(anchor="w", pady=(6,2))
        self.token_entry = tk.Entry(frame, width=40, bg=surface, fg=fg, insertbackground=fg, show="•")
        self.token_entry.pack(anchor="w", pady=(0,12))
        
        tk.Label(frame, text="Email (für Git):", bg=bg, fg=fg, font=("Arial", 10)).pack(anchor="w", pady=(6,2))
        self.email_entry = tk.Entry(frame, width=40, bg=surface, fg=fg, insertbackground=fg)
        self.email_entry.pack(anchor="w", pady=(0,12))
        
        # Hint
        hint = tk.Label(frame, text="Token: github.com/settings/tokens (new classic token, ✓ repo)", 
                       bg=bg, fg="#8b9099", font=("Arial", 8))
        hint.pack(anchor="w", pady=(0,16))
        
        # Button
        self.deploy_btn = tk.Button(frame, text="🚀 Jetzt deployen", command=self.on_deploy, 
                                   bg=accent, fg="#0f1210", font=("Arial", 11, "bold"), 
                                   padx=16, pady=10, relief="flat", cursor="hand2")
        self.deploy_btn.pack(pady=10)
        
        # Status
        self.status = tk.Label(root, text="", bg=bg, fg="#8b9099", font=("Arial", 9))
        self.status.pack(pady=8)
    
    def on_deploy(self):
        username = self.username_entry.get().strip()
        token = self.token_entry.get().strip()
        email = self.email_entry.get().strip()
        
        if not all([username, token, email]):
            messagebox.showerror("Error", "Alle Felder erforderlich")
            return
        
        # Tests zuerst, im Hauptthread - Dialoge gehoeren nicht in einen Worker
        self.status.config(text="⏳ Rechentests laufen...")
        self.root.update()
        bestanden, ausgabe = run_tests(os.getcwd())

        if bestanden is False:
            self.status.config(text="❌ Tests rot – nicht deployt", fg="#c2685a")
            messagebox.showerror(
                "Tests rot",
                "Deploy abgebrochen, es wurde nichts gepusht.\n\n" + ausgabe)
            return

        if bestanden is None:
            weiter = messagebox.askyesno(
                "Tests nicht gelaufen",
                ausgabe + "\n\nOhne Tests ist ungeprüft, ob die App richtig "
                "rechnet.\n\nTrotzdem deployen?")
            if not weiter:
                self.status.config(text="Abgebrochen", fg="#8b9099")
                return

        self.deploy_btn.config(state="disabled")
        self.status.config(text="⏳ Deployen läuft...")
        self.root.update()
        
        thread = threading.Thread(target=self._deploy_thread, args=(username, token, email))
        thread.daemon = True
        thread.start()
    
    def _deploy_thread(self, username, token, email):
        try:
            cwd = os.getcwd()
            
            # Git commands
            subprocess.run(['git', 'init'], cwd=cwd, capture_output=True, check=True)
            subprocess.run(['git', 'config', 'user.name', username], cwd=cwd, capture_output=True, check=True)
            subprocess.run(['git', 'config', 'user.email', email], cwd=cwd, capture_output=True, check=True)
            subprocess.run(['git', 'add', '.'], cwd=cwd, capture_output=True, check=True)
            # Leerer Commit ist kein Fehler - dann gibt es einfach nichts Neues
            subprocess.run(['git', 'commit', '-m', 'Update'], cwd=cwd, capture_output=True)
            subprocess.run(['git', 'branch', '-M', 'main'], cwd=cwd, capture_output=True, check=True)
            
            vorhanden = subprocess.run(['git', 'remote'], cwd=cwd,
                                       capture_output=True, text=True)
            if 'origin' not in (vorhanden.stdout or '').split():
                remote_url = f"https://{username}:{token}@github.com/{username}/tagebuch.git"
                subprocess.run(['git', 'remote', 'add', 'origin', remote_url],
                               cwd=cwd, capture_output=True, check=True)
            subprocess.run(['git', 'push', '-u', 'origin', 'main'], cwd=cwd, capture_output=True, check=True)
            
            self.root.after(0, self._on_success, username)
        except Exception as e:
            self.root.after(0, self._on_error, str(e))
    
    def _on_success(self, username):
        url = f"https://{username}.github.io/tagebuch"
        self.status.config(text="✅ Deploy erfolgreich!", fg="#7c9885")
        msg = f"App ist online!\n\n{url}\n\nNoch: GitHub-Repo Settings → Pages → Branch: main → Save\n\nDann auf dem Handy öffnen & Home-Screen speichern."
        messagebox.showinfo("Erfolg", msg)
        self.deploy_btn.config(state="normal")
    
    def _on_error(self, error):
        self.status.config(text="❌ Fehler beim Deploy", fg="#c2685a")
        messagebox.showerror("Fehler", f"Deploy fehlgeschlagen:\n\n{error}\n\nGit installiert? Sind die Daten im Ordner?")
        self.deploy_btn.config(state="normal")

if __name__ == "__main__":
    root = tk.Tk()
    app = DeployApp(root)
    root.mainloop()
