import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONObject;

import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class GameClient extends WebSocketClient {
    private Map<String, Player> players = new ConcurrentHashMap<>();
    private Player player;
    private JFrame frame;

    public GameClient(URI serverUri) {
        super(serverUri);
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        System.out.println("Connected to server");
        player = new Player("player.png", 100, 100);
        initUI();
        sendMessage("init", player.x, player.y);
    }

    @Override
    public void onMessage(String message) {
        JSONObject json = new JSONObject(message);

        if (json.getString("type").equals("update")) {
            players.clear();
            for (Object obj : json.getJSONArray("players")) {
                JSONObject p = (JSONObject) obj;
                players.put(p.getString("id"), new Player(p.getString("img"), p.getInt("x"), p.getInt("y")));
            }
            frame.repaint();
        }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        System.out.println("Disconnected from server");
    }

    @Override
    public void onError(Exception ex) {
        ex.printStackTrace();
    }

    private void sendMessage(String type, int x, int y) {
        JSONObject json = new JSONObject();
        json.put("type", type);
        json.put("x", x);
        json.put("y", y);
        send(json.toString());
    }

    private void initUI() {
        frame = new JFrame("Game");
        frame.setSize(800, 600);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);

        frame.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                int key = e.getKeyCode();
                if (key == KeyEvent.VK_UP) {
                    player.y -= 10;
                } else if (key == KeyEvent.VK_DOWN) {
                    player.y += 10;
                } else if (key == KeyEvent.VK_LEFT) {
                    player.x -= 10;
                } else if (key == KeyEvent.VK_RIGHT) {
                    player.x += 10;
                }
                sendMessage("move", player.x, player.y);
            }
        });

        frame.add(new JComponent() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                for (Player p : players.values()) {
                    g.drawImage(new ImageIcon(p.img).getImage(), p.x, p.y, this);
                }
            }
        });
    }
	
	static class EnvironmentObject {
        String type, img;
        int x, y;

        EnvironmentObject(String type, String img, int x, int y) {
            this.type = type;
            this.img = img;
            this.x = x;
            this.y = y;
        }
    }
}

    public static void main(String[] args) {
        try {
            GameClient client = new GameClient(new URI("ws://localhost:8080"));
            client.connect();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    static class Player {
        String img;
        int x, y;

        Player(String img, int x, int y) {
            this.img = img;
            this.x = x;
            this.y = y;
        }
    }
}
