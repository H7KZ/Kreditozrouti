#!/usr/bin/env python3
"""Exercise the real origin firewall in disposable network namespaces; needs root."""
import os
from pathlib import Path
import selectors
import shutil
import socket
import subprocess
import sys
import tempfile
import time


SCRIPT = Path(__file__).resolve()
FIREWALL = SCRIPT.parents[1] / "cloudflare-firewall.sh"


def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs)


def server(addresses):
    selector = selectors.DefaultSelector()
    for address in addresses:
        family = socket.AF_INET6 if ":" in address else socket.AF_INET
        for kind, ports in ((socket.SOCK_STREAM, (22, 80, 443)), (socket.SOCK_DGRAM, (80, 443))):
            for port in ports:
                connection = socket.socket(family, kind)
                connection.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                if family == socket.AF_INET6:
                    connection.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
                connection.bind((address, port))
                if kind == socket.SOCK_STREAM:
                    connection.listen()
                selector.register(connection, selectors.EVENT_READ)
    print("ready", flush=True)
    while True:
        for key, _ in selector.select():
            connection = key.fileobj
            if connection.type == socket.SOCK_STREAM:
                with connection.accept()[0] as client:
                    client.settimeout(1)
                    try:
                        client.sendall(client.recv(100))
                    except OSError:
                        pass
            else:
                data, address = connection.recvfrom(100)
                connection.sendto(data, address)


def probe(source, destination, protocol, port):
    family = socket.AF_INET6 if ":" in source else socket.AF_INET
    kind = socket.SOCK_STREAM if protocol == "tcp" else socket.SOCK_DGRAM
    with socket.socket(family, kind) as connection:
        connection.settimeout(1.5)
        connection.bind((source, 0))
        try:
            connection.connect((destination, int(port)))
            connection.sendall(b"firewall-probe")
            return connection.recv(100) == b"firewall-probe"
        except OSError:
            return False


def isolated():
    # Refuse mutations if someone bypasses the outer namespace launcher.
    assert os.stat("/proc/self/ns/net").st_ino != os.stat("/proc/1/ns/net").st_ino, "isolated network namespace required"
    children = []
    try:
        with tempfile.TemporaryDirectory(prefix="origin-firewall-test-") as directory:
            work = Path(directory)
            binaries = work / "bin"
            binaries.mkdir()
            real_nft = shutil.which("nft")
            (binaries / "curl").write_text('''#!/usr/bin/python3
import os, sys
if os.environ.get("FAIL_FETCH") == "1": raise SystemExit(22)
if sys.argv[-1].endswith("ips-v4"):
    print("10.23.0.2/32")
    for number in range(10): print(f"203.0.113.{number}/32")
    if os.environ.get("INVALID_CIDR") == "1": print("999.0.0.0/8")
else:
    print("fd00:23::2/128")
    for number in range(5): print(f"2001:db8:{number}::/48")
''')
            (binaries / "nft").write_text('''#!/usr/bin/python3
import os, pathlib, subprocess, sys, tempfile
arguments=sys.argv[1:]
if os.environ.get("FAIL_APPLY") == "1" and "--file" in arguments and "--check" not in arguments:
    with tempfile.NamedTemporaryFile(mode="w") as transaction:
        transaction.write(pathlib.Path(arguments[arguments.index("--file")+1]).read_text())
        transaction.write("\\ninvalid_nft_syntax_for_atomicity_test\\n")
        transaction.flush()
        raise SystemExit(subprocess.run([os.environ["REAL_NFT"], "--file", transaction.name]).returncode)
raise SystemExit(subprocess.run([os.environ["REAL_NFT"], *arguments]).returncode)
''')
            for path in binaries.iterdir():
                path.chmod(0o755)
            env = dict(os.environ, PATH=f"{binaries}:{os.environ['PATH']}", REAL_NFT=real_nft,
                       EXTRA_ALLOWED_V4="10.23.0.2/32", EXTRA_ALLOWED_V6="fd00:23::2/128")

            def namespace():
                child = subprocess.Popen(["unshare", "--net", sys.executable, "-c",
                                          "import os,time; print(os.getpid(),flush=True); time.sleep(3600)"],
                                         stdout=subprocess.PIPE, text=True)
                children.append(child)
                pid = int(child.stdout.readline())
                run("nsenter", "-t", str(pid), "-n", "ip", "link", "set", "lo", "up")
                return pid

            client_pid, backend_pid = namespace(), namespace()
            for name, pid, host4, peer4, host6, peer6 in (
                    ("client", client_pid, "10.23.0.1/24", "10.23.0.2/24", "fd00:23::1/64", "fd00:23::2/64"),
                    ("backend", backend_pid, "10.24.0.1/24", "10.24.0.2/24", "fd00:24::1/64", "fd00:24::2/64")):
                run("ip", "link", "add", name, "type", "veth", "peer", "name", "peer-" + name)
                run("ip", "link", "set", "peer-" + name, "netns", str(pid))
                run("ip", "addr", "add", host4, "dev", name)
                run("ip", "-6", "addr", "add", host6, "dev", name, "nodad")
                run("ip", "link", "set", name, "up")
                prefix = ("nsenter", "-t", str(pid), "-n", "ip")
                run(*prefix, "addr", "add", peer4, "dev", "peer-" + name)
                run(*prefix, "-6", "addr", "add", peer6, "dev", "peer-" + name, "nodad")
                run(*prefix, "link", "set", "peer-" + name, "up")
                run(*prefix, "route", "add", "default", "via", host4.split("/")[0])
                run(*prefix, "-6", "route", "add", "default", "via", host6.split("/")[0])
            run("nsenter", "-t", str(client_pid), "-n", "ip", "addr", "add", "10.23.0.3/24", "dev", "peer-client")
            run("nsenter", "-t", str(client_pid), "-n", "ip", "-6", "addr", "add", "fd00:23::3/64", "dev", "peer-client", "nodad")
            Path("/proc/sys/net/ipv4/ip_forward").write_text("1\n")
            Path("/proc/sys/net/ipv6/conf/all/forwarding").write_text("1\n")
            backend = subprocess.Popen(["nsenter", "-t", str(backend_pid), "-n", sys.executable, str(SCRIPT),
                                        "--server", "10.24.0.2", "fd00:24::2"],
                                       stdout=subprocess.PIPE, text=True)
            children.append(backend)
            assert backend.stdout.readline().strip() == "ready"
            run("ip", "addr", "add", "10.23.0.10/24", "dev", "client")
            run("ip", "-6", "addr", "add", "fd00:23::10/64", "dev", "client", "nodad")
            local = subprocess.Popen([sys.executable, str(SCRIPT), "--server", "10.23.0.10", "fd00:23::10"],
                                     stdout=subprocess.PIPE, text=True)
            children.append(local)
            assert local.stdout.readline().strip() == "ready"
            # Auto-generated link-local addresses complete DAD before IPv6 NDP.
            time.sleep(1.2)
            run(real_nft, "-f", "-", input='''table ip docker_fixture {
 chain prerouting { type nat hook prerouting priority -100; policy accept;
  ip daddr 10.23.0.1 tcp dport {22,80,443} dnat to 10.24.0.2
  ip daddr 10.23.0.1 udp dport {80,443} dnat to 10.24.0.2
 }
}
table ip6 docker_fixture {
 chain prerouting { type nat hook prerouting priority -100; policy accept;
  ip6 daddr fd00:23::1 tcp dport {22,80,443} dnat to fd00:24::2
  ip6 daddr fd00:23::1 udp dport {80,443} dnat to fd00:24::2
 }
}
''')

            def allowed(source, destination, protocol, port):
                result = run("nsenter", "-t", str(client_pid), "-n", sys.executable, str(SCRIPT),
                             "--probe", source, destination, protocol, str(port))
                return result.stdout.strip() == "allowed"

            protocols = (("tcp", 80), ("tcp", 443), ("udp", 443))
            # Both source identities reach Docker's simulated published ports before protection.
            for source, destination in (("10.23.0.3", "10.23.0.1"), ("fd00:23::3", "fd00:23::1"),
                                        ("10.23.0.3", "10.23.0.10"), ("fd00:23::3", "fd00:23::10")):
                for protocol, port in protocols:
                    assert allowed(source, destination, protocol, port), ("baseline", source, protocol, port)
            dry_run = run("bash", str(FIREWALL), "--dry-run", env=env)
            assert "priority -110" in dry_run.stdout
            assert "cloudflare_origin" not in run(real_nft, "list", "tables").stdout
            run("bash", str(FIREWALL), env=env)
            run("bash", str(FIREWALL), env=env)  # Existing table replacement must also succeed.
            for source, destination, expected in (("10.23.0.2", "10.23.0.1", True),
                                                  ("10.23.0.3", "10.23.0.1", False),
                                                  ("fd00:23::2", "fd00:23::1", True),
                                                  ("fd00:23::3", "fd00:23::1", False),
                                                  ("10.23.0.2", "10.23.0.10", True),
                                                  ("10.23.0.3", "10.23.0.10", False),
                                                  ("fd00:23::2", "fd00:23::10", True),
                                                  ("fd00:23::3", "fd00:23::10", False)):
                for protocol, port in protocols:
                    assert allowed(source, destination, protocol, port) == expected, (source, destination, protocol, port)
            for source, destination in (("10.23.0.3", "10.24.0.2"), ("fd00:23::3", "fd00:24::2")):
                for protocol, port in protocols:
                    assert allowed(source, destination, protocol, port), ("routed egress", source, protocol, port)
            for source, destination in (("10.23.0.3", "10.23.0.1"), ("fd00:23::3", "fd00:23::1")):
                for protocol, port in (("tcp", 22), ("udp", 80)):
                    assert allowed(source, destination, protocol, port), ("unrestricted port", source, protocol, port)
            original = run(real_nft, "list", "table", "inet", "cloudflare_origin").stdout
            for failure in (dict(FAIL_APPLY="1"), dict(FAIL_FETCH="1"), dict(INVALID_CIDR="1"),
                            dict(EXTRA_ALLOWED_V4="10.0.0.0/99"), dict(EXTRA_ALLOWED_V6="10.0.0.0/8")):
                result = subprocess.run(["bash", str(FIREWALL)], env=dict(env, **failure), capture_output=True, text=True)
                assert result.returncode != 0, failure
                assert run(real_nft, "list", "table", "inet", "cloudflare_origin").stdout == original, failure
            print("PASS: dualstack Docker DNAT and local INPUT TCP80/TCP443/UDP443, allowed CIDRs, routed egress, atomic replacement, fetch/CIDR failures")
    finally:
        for child in reversed(children):
            child.terminate()
        for child in reversed(children):
            child.wait(timeout=5)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--server"]:
        server(sys.argv[2:])
    elif sys.argv[1:2] == ["--probe"]:
        print("allowed" if probe(*sys.argv[2:]) else "blocked")
    elif sys.argv[1:] == ["--isolated"]:
        isolated()
    else:
        if os.geteuid() != 0:
            raise SystemExit("Run as root; test creates disposable network namespaces only")
        for tool in ("nft", "ip", "nsenter", "unshare", "bash"):
            if not shutil.which(tool):
                raise SystemExit(f"Missing prerequisite: {tool}")
        raise SystemExit(subprocess.run(["unshare", "--net", sys.executable, str(SCRIPT), "--isolated"]).returncode)
