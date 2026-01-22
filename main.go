package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// connected clients
var clientIdLen int = 4
var maxClients int = 100
var clientsMu sync.RWMutex

func sendMessage(ws *websocket.Conn, mode string, sender string, content map[string]string) {
	message, err := json.Marshal(map[string]interface{}{"mode": mode, "sender": sender, "data": content})
	if err != nil {
		log.Fatal("Error marshalling data:", content)
	}

	err = ws.WriteMessage(websocket.TextMessage, message)
	if err != nil {
		log.Fatal("Error writing message:", content)
	}
}

type Message struct {
	Mode     string            `json:"mode"`
	Target   string            `json:"target"`             //送信先のタイプ
	Receiver string            `json:"receiver,omitempty"` //送信先
	Data     map[string]string `json:"data,omitempty"`
}

type ClientList struct {
	clients      map[string]*websocket.Conn
	clientKeys   map[string]string
	clientActive map[string]int
	file         string
}

func load() *ClientList {
	return &ClientList{
		clients:      make(map[string]*websocket.Conn),
		clientKeys:   make(map[string]string),
		clientActive: make(map[string]int),
		file:         "./client.json",
	}
}

// return: ws, cid, clientKey
func (c *ClientList) create(ws *websocket.Conn) (string, string) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	if len(c.clients)+1 > maxClients {
		sendMessage(ws, "error", "server",
			map[string]string{
				"message": "Max clients reached. Try again later.",
			})
		return "", ""
	}

	uuidV4, _ := uuid.NewRandom()
	clientId := strings.ReplaceAll(uuidV4.String(), "-", "")[1 : clientIdLen+1]
	for _, ok := c.clients[clientId]; ok; _, ok = c.clients[clientId] {
		uuidV4, _ = uuid.NewRandom()
		clientId = strings.ReplaceAll(uuidV4.String(), "-", "")[1 : clientIdLen+1]
	}

	uuidV4, _ = uuid.NewRandom()
	c.clientKeys[clientId] = uuidV4.String()

	c.clients[clientId] = ws

	return clientId, c.clientKeys[clientId]
}

func (c *ClientList) remove(clientId string) bool {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	delete(c.clients, clientId)
	delete(c.clientKeys, clientId)
	delete(c.clientActive, clientId)
	return true
}

func (c *ClientList) store() {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	data, err := json.MarshalIndent(c.clientKeys, "", "  ")
	if err != nil {
		log.Fatalln("Error marshalling data:", c.clientActive)
		return
	}

	err = os.WriteFile(c.file, data, 0644)
	if err != nil {
		log.Fatalln("Error writing file:", c.file)
		return
	}
}

func main() {
	wsUpgrade := websocket.Upgrader{
		ReadBufferSize:  1024 * 1024 * 50,
		WriteBufferSize: 1024 * 1024 * 50,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	clientList := load()

	router := gin.Default()

	router.GET("/:file", func(c *gin.Context) {
		print(c.Param("file") + "\n")
		path := c.Param("file")
		c.File("public/" + path)
	})
	router.GET("/images/:file", func(c *gin.Context) {
		path := c.Param("file")
		c.File("public/images/" + path)
	})
	router.GET("/fonts/:folder/:file", func(c *gin.Context) {
		folder := c.Param("folder")
		file := c.Param("file")
		path := fmt.Sprintf("public/fonts/%s/%s", folder, file)
		c.File(path)
	})

	router.GET("/ws", func(c *gin.Context) {
		ws, err := wsUpgrade.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		clientId, clientKey := clientList.create(ws)

		defer func(ws *websocket.Conn) {
			err := ws.Close()
			//clientList.remove(clientId)
			if err != nil {
				log.Fatal(err)
			}
		}(ws)

		// send clientId to client
		sendMessage(ws, "cid", "server", map[string]string{"cid": clientId, "rKey": clientKey})
		for {
			_, msg, err := ws.ReadMessage()
			if err != nil {
				break
			}
			//println(string(msg))
			var message Message
			fmt.Println(fmt.Sprintf("%v", message))
			if err := json.Unmarshal(msg, &message); err != nil {
				log.Println("Error unmarshalling data:", err)
				break
			}

			if message.Target == "server" {
				if message.Mode == "server-ping" {
					sendMessage(ws, "server-pong", "server", map[string]string{"index": fmt.Sprintf("%v", message.Data["index"])})
				} else if message.Mode == "reconnect" {
					fmt.Println(message.Data["rCid"])
					if _, has := clientList.clients[message.Data["rCid"]]; has {
						fmt.Println("reconnect")
						if clientList.clientKeys[message.Data["rCid"]] == message.Data["rKey"] {
							clientList.clients[message.Data["rCid"]] = ws
							clientList.remove(clientId)
							clientId = message.Data["rCid"]
							clientKey = clientList.clientKeys[clientId]
							sendMessage(ws, "reconnect", "server", map[string]string{"content": "success", "rCid": clientId})
						} else {
							sendMessage(ws, "reconnect", "server", map[string]string{"content": "failed"})
						}
					} else {
						sendMessage(ws, "reconnect", "server", map[string]string{"content": "failed"})
					}
				}
			} else if message.Target == "client" {
				if message.Receiver == "" {
					// receiverが存在しない場合のエラーハンドリング
					sendMessage(ws, "error", "server", map[string]string{
						"message": "Invalid receiver",
						"code":    "c0002",
					})
					return
				}

				if cws, h := clientList.clients[message.Receiver]; h {
					sendMessage(cws, message.Mode, clientId, message.Data)
				} else {
					println("Client not found")
					for clientId := range clientList.clients {
						println("clientId: " + clientId)
					}
					sendMessage(ws, "error", "server", map[string]string{"message": "ClientList not found", "code": "c0001"})
				}
			}
		}
	})

	router.GET("/", func(c *gin.Context) {
		c.File("public/client.html")
	})

	fmt.Println("listening http://127.0.0.1:9080")

	err := router.Run(":9080")
	if err != nil {
		return
	}
}
