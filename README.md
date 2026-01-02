# Diář FISáka

[Odkaz na wiki](https://gitlab.com/groups/FIS-VSE/4IT115/2025ZS/ut1245/enga03/di-fis-ka/-/wikis/home)

---

### Useful commands

```
cat ssh_key | base64 | tr -d \\n | xclip -selection clipboard
cat ssh_key | base64 -w0 | xclip -selection clipboard

docker kill $(docker ps -q) # to kill all running containers
docker rm $(docker ps -a -q) # to delete all stopped containers.
docker volume rm $(docker volume ls -q) # to delete all volumes.
docker rmi $(docker images -q) # to delete all images.
docker system prune --all

docker kill $(docker ps -q) && docker rm $(docker ps -a -q) && docker volume rm $(docker volume ls -q) && docker rmi $(docker images -q) && docker system prune --all
```
