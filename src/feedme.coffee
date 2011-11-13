sax = require 'sax'


isEmpty = (obj) ->
  obj? and 0 is (key for own key of obj).length


TEXT_REGEXP = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m
childTag = (parser, parent, node, parentcb) ->
  obj = {}
  if not isEmpty node.attributes
    for own property of node.attributes
      obj[property] = node.attributes[property]

  gottext = ''
  textf = (text) ->
    rs = TEXT_REGEXP.exec(text)
    return if rs isnt null and rs.index is 0 and rs[0] is rs.input
    gottext += text

  # we have to go deeper
  openf = (node) ->
    parser.removeListener 'text', textf if not gottext
    parser.removeListener 'cdata', textf
    parser.removeListener 'closetag', closef
    childTag parser, obj, node, cb

  closef = (name) ->
    parser.removeListener 'text', textf if not gottext
    parser.removeListener 'cdata', textf
    parser.removeListener 'opentag', openf
    if gottext isnt ''
      gottext = trimIndent gottext
      if isEmpty obj
        obj = gottext
      else
        obj.text = gottext

    # only turn a value into an array if there is more than
    # one tag with the same name
    if parent[node.name]?
      if not Array.isArray parent[node.name]
        parent[node.name] = [parent[node.name]]
      parent[node.name].push obj
    else
      parent[node.name] = obj

    parentcb(node.name, obj)

  cb = ->
    parser.once 'text', textf if not gottext
    parser.on 'cdata', textf
    parser.once 'opentag', openf
    parser.once 'closetag', closef

  cb()


# removes leading white space from indentation
TRIM_REGEXP = /^( {3})+|( {2})+|( {4})+|(\t)+$/m
trimIndent = (str) ->
  split = str.split '\n'
  if split.length and (rs = TRIM_REGEXP.exec split[split.length - 1])
    indent = rs[1] or rs[2] or rs[3] or rs[4]

    # check start and end
    return str if split.shift() isnt ''
    split.pop()

    # get real indent
    wholeindent = rs[0] + indent

    # check every start of each line starts with the same indent
    for s, i in split
      return str if s.indexOf(wholeindent) isnt 0
      split[i] = s.substr(wholeindent.length)
    str = split.join '\n'
  str


module.exports = ->
  parser = sax.createStream(false, { lowercasetags: true })

  openf1 = (node) ->
    if node.name is 'channel' or node.name is 'feed'
      parser.removeListener 'opentag', openf1
      parser.on 'opentag', openf2
  parser.on 'opentag', openf1

  root = {}
  openf2 = (node) ->
    parser.removeListener 'opentag', openf2
    childTag parser, root, node, cb

  cb = (key, value) ->
    # start listening to tags for root again
    parser.on 'opentag', openf2

    # add tag to root
    # and emit to parser
    if key is 'item' or key is 'entry'
      parser.emit 'item', value
    else
      parser.emit key, value

  parser.done = ->
    if root.item?
      items = root.item
      delete root.item
    else if root.entry?
      items = root.entry
      delete root.entry

    if items
      if not Array.isArray items
        items = [items]
      root.items = items
    root

  parser
